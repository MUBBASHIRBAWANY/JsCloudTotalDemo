import EmployeeHrModal from "../modal/EmployeeHrModal.js";
import PayrollModal from "../modal/PayrollModal.js";
import LeaveApplicationModal from "../modal/LeaveApplicationModal.js";
import JobPostingModal from "../modal/JobPostingModal.js";
import ApplicantModal from "../modal/ApplicantModal.js";
import SeparationRequestModal from "../modal/SeparationRequestModal.js";
import CertificationModal from "../modal/CertificationModal.js";
import EmployeeDocumentModal from "../modal/EmployeeDocumentModal.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a Date set to the start of today (midnight UTC-local). */
function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

/** Returns a Date N days from the start of today. */
function daysFromNow(n) {
    const d = startOfToday();
    d.setDate(d.getDate() + n);
    return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /HrDashboard — All dashboard metrics in one response
// Requirements 8.1–8.11, 9.6
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboardData = async (req, res) => {

    // Optional department filter
    const deptId = req.query.department ?? null;

    // ── 1. Headcount (Req 8.1) ────────────────────────────────────────────────
    let headcount = null;
    try {
        const activeStatuses = { $nin: ["terminated", "resigned", "retired", "deceased"] };
        const baseMatch = { status: activeStatuses };
        if (deptId) baseMatch.departmentId = deptId;

        const [totalResult, byDept, byType] = await Promise.all([
            EmployeeHrModal.countDocuments(baseMatch),

            EmployeeHrModal.aggregate([
                { $match: baseMatch },
                { $group: { _id: "$departmentId", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),

            EmployeeHrModal.aggregate([
                { $match: baseMatch },
                { $group: { _id: "$employmentType", count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ])
        ]);

        headcount = {
            total: totalResult,
            byDepartment: byDept,
            byEmploymentType: byType
        };
    } catch (err) {
        console.error(err);
        headcount = { error: "Headcount unavailable: Headcount could not be loaded." };
    }

    // ── 2. Attrition rate (Req 8.2) ───────────────────────────────────────────
    let attrition = null;
    try {
        const now = new Date();
        // Build an array of { year, month } for the last 12 calendar months
        const months = [];
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }

        const sepMatch = { createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - 11, 1) } };
        if (deptId) {
            // Join through employee to filter by department
            const empIds = await EmployeeHrModal.distinct("_id", { departmentId: deptId });
            sepMatch.employeeId = { $in: empIds };
        }

        const [separationsByMonth, activeCount] = await Promise.all([
            SeparationRequestModal.aggregate([
                { $match: sepMatch },
                {
                    $group: {
                        _id: {
                            year:  { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        separations: { $sum: 1 }
                    }
                }
            ]),
            EmployeeHrModal.countDocuments({
                status: { $nin: ["terminated", "resigned", "retired", "deceased"] },
                ...(deptId ? { departmentId: deptId } : {})
            })
        ]);

        const sepMap = {};
        for (const s of separationsByMonth) {
            sepMap[`${s._id.year}-${s._id.month}`] = s.separations;
        }

        const trend = months.map(({ year, month }) => {
            const separations = sepMap[`${year}-${month}`] ?? 0;
            // Use current active headcount as average headcount approximation per month
            const rate = activeCount > 0
                ? parseFloat(((separations / activeCount) * 100).toFixed(2))
                : null;
            return { year, month, separations, averageHeadcount: activeCount, rate };
        });

        attrition = { trend };
    } catch (err) {
        console.error(err);
        attrition = { error: "Attrition unavailable: Attrition could not be loaded." };
    }

    // ── 3. Payroll cost trend (Req 8.3) ───────────────────────────────────────
    let payrollTrend = null;
    try {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

        const payrollMatch = {
            status: { $in: ["processed", "approved", "paid"] },
            $or: [
                { year: { $gt: twelveMonthsAgo.getFullYear() } },
                {
                    year:  twelveMonthsAgo.getFullYear(),
                    month: { $gte: twelveMonthsAgo.getMonth() + 1 }
                }
            ]
        };

        if (deptId) {
            const empIds = await EmployeeHrModal.distinct("_id", { departmentId: deptId });
            payrollMatch.employeeId = { $in: empIds };
        }

        const trend = await PayrollModal.aggregate([
            { $match: payrollMatch },
            {
                $group: {
                    _id:             { year: "$year", month: "$month" },
                    totalGross:      { $sum: "$grossSalary" },
                    totalNet:        { $sum: "$netSalary" },
                    totalDeductions: { $sum: "$totalDeductions" },
                    headcount:       { $sum: 1 }
                }
            },
            {
                $project: {
                    _id:  0,
                    year:            "$_id.year",
                    month:           "$_id.month",
                    totalGross:      1,
                    totalNet:        1,
                    totalDeductions: 1,
                    headcount:       1
                }
            },
            { $sort: { year: 1, month: 1 } }
        ]);

        payrollTrend = trend;
    } catch (err) {
        console.error(err);
        payrollTrend = { error: "Payroll trend unavailable: The payroll trend could not be loaded." };
    }

    // ── 4. Department breakdown (Req 8.4) ─────────────────────────────────────
    let deptBreakdown = null;
    try {
        const empMatch = { status: { $nin: ["terminated", "resigned", "retired", "deceased"] } };
        if (deptId) empMatch.departmentId = deptId;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const [empAgg, payrollAgg, leaveAgg] = await Promise.all([
            // Headcount + avg basic salary per department
            EmployeeHrModal.aggregate([
                { $match: empMatch },
                {
                    $group: {
                        _id:          "$departmentId",
                        headcount:    { $sum: 1 },
                        avgBasicSalary: { $avg: "$salarySetupBasket.basicSalary" }
                    }
                }
            ]),

            // Total payroll cost per department this month
            PayrollModal.aggregate([
                {
                    $match: {
                        year:   currentYear,
                        month:  currentMonth,
                        status: { $in: ["processed", "approved", "paid"] },
                        ...(deptId ? {} : {})  // dept filter done via lookup below
                    }
                },
                {
                    $lookup: {
                        from:         "hremployees",
                        localField:   "employeeId",
                        foreignField: "_id",
                        as:           "employee"
                    }
                },
                { $unwind: "$employee" },
                ...(deptId ? [{ $match: { "employee.departmentId": deptId } }] : []),
                {
                    $group: {
                        _id:        "$employee.departmentId",
                        totalPayroll: { $sum: "$grossSalary" }
                    }
                }
            ]),

            // Leave utilisation per department: approved days / allocated days × 100
            LeaveApplicationModal.aggregate([
                {
                    $match: {
                        status: "approved",
                        startDate: { $gte: new Date(currentYear, 0, 1) }
                    }
                },
                {
                    $lookup: {
                        from:         "hremployees",
                        localField:   "employeeId",
                        foreignField: "_id",
                        as:           "employee"
                    }
                },
                { $unwind: "$employee" },
                ...(deptId ? [{ $match: { "employee.departmentId": deptId } }] : []),
                {
                    $group: {
                        _id:          "$employee.departmentId",
                        approvedDays: { $sum: "$daysRequested" }
                    }
                }
            ])
        ]);

        // Build lookup maps
        const payrollMap = {};
        for (const p of payrollAgg) {
            payrollMap[String(p._id)] = p.totalPayroll;
        }
        const leaveMap = {};
        for (const l of leaveAgg) {
            leaveMap[String(l._id)] = l.approvedDays;
        }

        // Allocated leave days: sum allocated buckets per dept
        const allocatedAgg = await EmployeeHrModal.aggregate([
            { $match: empMatch },
            {
                $group: {
                    _id: "$departmentId",
                    totalAllocated: {
                        $sum: {
                            $add: [
                                "$leaveBucket.casual.allocated",
                                "$leaveBucket.medical.allocated",
                                "$leaveBucket.annual.allocated"
                            ]
                        }
                    }
                }
            }
        ]);
        const allocatedMap = {};
        for (const a of allocatedAgg) {
            allocatedMap[String(a._id)] = a.totalAllocated;
        }

        deptBreakdown = empAgg.map(dept => {
            const dId = String(dept._id);
            const allocated   = allocatedMap[dId] ?? 0;
            const approved    = leaveMap[dId] ?? 0;
            const leaveUtil   = allocated > 0
                ? parseFloat(((approved / allocated) * 100).toFixed(2))
                : 0;
            return {
                departmentId:       dept._id,
                headcount:          dept.headcount,
                avgBasicSalary:     parseFloat((dept.avgBasicSalary ?? 0).toFixed(2)),
                totalPayrollCost:   payrollMap[dId] ?? 0,
                leaveUtilisationPct: leaveUtil
            };
        });
    } catch (err) {
        console.error(err);
        deptBreakdown = { error: "Department breakdown unavailable: The department breakdown could not be loaded." };
    }

    // ── 5. Leave utilisation (Req 8.5) ────────────────────────────────────────
    let leaveUtilisation = null;
    try {
        const now = new Date();
        const yearStart = new Date(now.getFullYear(), 0, 1);

        const leaveMatch = {
            status:    "approved",
            startDate: { $gte: yearStart }
        };

        if (deptId) {
            const empIds = await EmployeeHrModal.distinct("_id", { departmentId: deptId });
            leaveMatch.employeeId = { $in: empIds };
        }

        const [approvedByType, allocatedAgg] = await Promise.all([
            LeaveApplicationModal.aggregate([
                { $match: leaveMatch },
                {
                    $group: {
                        _id:          "$leaveType",
                        approvedDays: { $sum: "$daysRequested" }
                    }
                }
            ]),

            EmployeeHrModal.aggregate([
                {
                    $match: {
                        status: { $nin: ["terminated", "resigned", "retired", "deceased"] },
                        ...(deptId ? { departmentId: deptId } : {})
                    }
                },
                {
                    $group: {
                        _id: null,
                        casualAllocated:  { $sum: "$leaveBucket.casual.allocated" },
                        medicalAllocated: { $sum: "$leaveBucket.medical.allocated" },
                        annualAllocated:  { $sum: "$leaveBucket.annual.allocated" }
                    }
                }
            ])
        ]);

        const allocated = allocatedAgg[0] ?? { casualAllocated: 0, medicalAllocated: 0, annualAllocated: 0 };
        const allocMap = {
            casual:  allocated.casualAllocated,
            medical: allocated.medicalAllocated,
            annual:  allocated.annualAllocated
        };

        const byType = approvedByType.map(lt => {
            const alloc = allocMap[lt._id] ?? 0;
            const utilPct = alloc > 0
                ? parseFloat(((lt.approvedDays / alloc) * 100).toFixed(2))
                : null;
            return {
                leaveType:        lt._id,
                approvedDays:     lt.approvedDays,
                allocatedDays:    alloc,
                utilisationPct:   utilPct
            };
        });

        const totalApproved  = approvedByType.reduce((s, t) => s + t.approvedDays, 0);
        const totalAllocated = Object.values(allocMap).reduce((s, v) => s + v, 0);

        leaveUtilisation = {
            year:            now.getFullYear(),
            totalApprovedDays:   totalApproved,
            totalAllocatedDays:  totalAllocated,
            overallUtilisationPct: totalAllocated > 0
                ? parseFloat(((totalApproved / totalAllocated) * 100).toFixed(2))
                : null,
            byLeaveType: byType
        };
    } catch (err) {
        console.error(err);
        leaveUtilisation = { error: "Leave utilisation unavailable: Leave utilisation could not be loaded." };
    }

    // ── 6. Recruitment (Req 8.6) ──────────────────────────────────────────────
    let recruitment = null;
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const jobMatch = { status: "published" };
        if (deptId) jobMatch.departmentId = deptId;

        const [openPostings, hiredThisMonth] = await Promise.all([
            JobPostingModal.countDocuments(jobMatch),
            ApplicantModal.countDocuments({
                currentStage:    "Hired",
                updatedAt:       { $gte: monthStart }
            })
        ]);

        recruitment = { openPostings, hiredThisMonth };
    } catch (err) {
        console.error(err);
        recruitment = { error: "Recruitment unavailable: Recruitment figures could not be loaded." };
    }

    // ── 7. Probation expiry (Req 8.7) ─────────────────────────────────────────
    let probationExpiry = null;
    try {
        const today  = startOfToday();
        const in30   = daysFromNow(30);

        const empMatch = {
            probationEndDate: { $gte: today, $lte: in30 },
            status:           { $nin: ["terminated", "resigned", "retired", "deceased"] }
        };
        if (deptId) empMatch.departmentId = deptId;

        const employees = await EmployeeHrModal.find(empMatch)
            .select("firstName lastName code designationId probationEndDate")
            .populate("designationId", "title")
            .sort({ probationEndDate: 1 });

        probationExpiry = employees.map(e => ({
            employeeId:      e._id,
            code:            e.code,
            name:            `${e.firstName} ${e.lastName}`.trim(),
            designation:     e.designationId?.title ?? "",
            probationEndDate: e.probationEndDate
        }));
    } catch (err) {
        console.error(err);
        probationExpiry = { error: "Probation expiry unavailable: Probation expiries could not be loaded." };
    }

    // ── 8. Certifications expiring (Req 8.8) ──────────────────────────────────
    let certificationsExpiring = null;
    try {
        const today = startOfToday();
        const in30  = daysFromNow(30);

        const certMatch = {
            expiryDate: { $gte: today, $lt: in30 }
        };

        if (deptId) {
            const empIds = await EmployeeHrModal.distinct("_id", { departmentId: deptId });
            certMatch.employeeId = { $in: empIds };
        }

        const count = await CertificationModal.countDocuments(certMatch);
        certificationsExpiring = { count, within30Days: true };
    } catch (err) {
        console.error(err);
        certificationsExpiring = { error: "Certification expiry unavailable: Expiring certifications could not be loaded." };
    }

    // ── 9. Document expiry (Req 9.6) ──────────────────────────────────────────
    let documentExpiry = null;
    try {
        const today = startOfToday();
        const in30  = daysFromNow(30);

        const docMatch = {
            expiryDate: { $exists: true, $ne: null },
            $or: [
                { expiryDate: { $lt: today } },           // already expired
                { expiryDate: { $gte: today, $lte: in30 } } // expiring within 30 days
            ]
        };

        if (deptId) {
            const empIds = await EmployeeHrModal.distinct("_id", { departmentId: deptId });
            docMatch.employeeId = { $in: empIds };
        }

        const docs = await EmployeeDocumentModal.find(docMatch)
            .select("employeeId documentType documentTitle expiryDate")
            .sort({ expiryDate: 1 });

        documentExpiry = docs.map(d => ({
            documentId:    d._id,
            employeeId:    d.employeeId,
            documentType:  d.documentType,
            documentTitle: d.documentTitle,
            expiryDate:    d.expiryDate,
            expiryStatus:  d.expiryStatus   // virtual field from schema
        }));
    } catch (err) {
        console.error(err);
        documentExpiry = { error: "Document expiry unavailable: Expiring documents could not be loaded." };
    }

    // ── Final response ─────────────────────────────────────────────────────────
    return res.status(200).send({
        status: true,
        data: {
            headcount,
            attrition,
            payrollTrend,
            deptBreakdown,
            leaveUtilisation,
            recruitment,
            probationExpiry,
            certificationsExpiring,
            documentExpiry
        }
    });
};
