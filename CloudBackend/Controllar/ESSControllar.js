import AttendanceHrModal from "../Modal/AttendanceHrModal.js";
import LoanModal from "../Modal/LoanModal.js";
import PayrollModal from "../Modal/PayrollModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import { hrmsCatch, hrmsBody } from "../utils/hrmsError.js";


/**
 * Helper: extract the authenticated employee's ObjectId from req.user.
 * The auth middleware stores the employee's _id as req.user.employeeId.
 */
function getAuthEmployeeId(req) {
    return req.user && req.user.employeeId ? req.user.employeeId : null;
}

/**
 * GET /HrESS/dashboard
 * Returns dashboard summary for the authenticated employee:
 *   - current-month attendance stats (present / absent / late)
 *   - leave balances per type from leaveBucket
 *   - active loan total (sum of remainingBalance where status=active, 0 if none)
 *   - last payroll net salary ("Not yet processed" if none)
 * Requirement 3.2
 */
export const getDashboard = async (req, res) => {
    try {
        const employeeId = getAuthEmployeeId(req);
        if (!employeeId) {
            return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to continue."));
        }

        // If empId is provided as a route param, enforce ownership — Requirement 3.10
        if (req.params.empId && String(req.params.empId) !== String(employeeId)) {
            return res.status(403).json(hrmsBody("Access denied", "You can only view your own records."));
        }

        // Current month / year
        const now = new Date();
        const month = now.getMonth() + 1; // 1-based
        const year = now.getFullYear();

        // Build date prefix for string-based date field: "YYYY-MM"
        const monthStr = String(month).padStart(2, "0");
        const datePrefix = `${year}-${monthStr}`;

        // Attendance stats for current month
        const attendanceRecords = await AttendanceHrModal.find({
            employeeId,
            date: { $regex: `^${datePrefix}` }
        });

        const attendanceStats = { present: 0, absent: 0, late: 0 };
        for (const record of attendanceRecords) {
            if (record.status === "present") attendanceStats.present++;
            else if (record.status === "absent") attendanceStats.absent++;
            else if (record.status === "late") attendanceStats.late++;
        }

        // Leave balances from employee record
        const employee = await EmployeeHrModal.findById(employeeId, { leaveBucket: 1 });
        if (!employee) {
            return res.status(404).json(hrmsBody("Employee not found", "No employee exists for this account."));
        }
        const leaveBalances = employee.leaveBucket;

        // Active loan total — Requirement 3.2
        const activeLoans = await LoanModal.find({ employeeId, status: "active" });
        const loanTotal = activeLoans.reduce((sum, loan) => sum + (loan.remainingBalance || 0), 0);

        // Last payroll net salary — sorted by year desc, month desc — Requirement 3.2
        const lastPayroll = await PayrollModal.findOne({ employeeId })
            .sort({ year: -1, month: -1 })
            .select("netSalary month year");

        const lastPayrollNet = lastPayroll ? lastPayroll.netSalary : "Not yet processed";

        return res.status(200).json({
            status: true,
            data: {
                attendance: attendanceStats,
                leaveBalances,
                loanBalance: loanTotal,
                lastPayrollNet
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Dashboard load failed", "The dashboard could not be loaded. Please try again.");
    }
};

/**
 * GET /HrESS/payslips
 * Paginated list of payslips for the authenticated employee.
 * Query param: page (default 1), 10 records per page, sorted year+month desc.
 * Requirement 3.3
 */
export const getPayslips = async (req, res) => {
    try {
        const employeeId = getAuthEmployeeId(req);
        if (!employeeId) {
            return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to continue."));
        }

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = 10;
        const skip = (page - 1) * limit;

        const [payslips, total] = await Promise.all([
            PayrollModal.find({ employeeId })
                .sort({ year: -1, month: -1 })
                .skip(skip)
                .limit(limit),
            PayrollModal.countDocuments({ employeeId })
        ]);

        return res.status(200).json({
            status: true,
            data: payslips,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Payslips load failed", "The payslips could not be loaded. Please try again.");
    }
};

/**
 * GET /HrESS/payslips/:id
 * Single payslip detail for the authenticated employee.
 * Requirement 3.4
 */
export const getPayslipById = async (req, res) => {
    try {
        const employeeId = getAuthEmployeeId(req);
        if (!employeeId) {
            return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to continue."));
        }

        const payslip = await PayrollModal.findById(req.params.id);
        if (!payslip) {
            return res.status(404).json(hrmsBody("Payslip not found", "No payslip exists for this id."));
        }

        // Enforce ownership — Requirement 3.10
        if (String(payslip.employeeId) !== String(employeeId)) {
            return res.status(403).json(hrmsBody("Access denied", "You can only view your own payslips."));
        }

        return res.status(200).json({ status: true, data: payslip });
    } catch (err) {
        return hrmsCatch(res, err, "Payslip load failed", "The payslip could not be loaded. Please try again.");
    }
};

/**
 * GET /HrESS/attendance
 * Monthly attendance summary for the authenticated employee.
 * Query params: month (1-12), year (YYYY) — defaults to current month/year.
 * Returns day-by-day array with checkIn, checkOut, status.
 * If no records exist, returns empty array with message.
 * Requirement 3.7
 */
export const getAttendanceSummary = async (req, res) => {
    try {
        const employeeId = getAuthEmployeeId(req);
        if (!employeeId) {
            return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to continue."));
        }

        const now = new Date();
        const month = parseInt(req.query.month, 10) || (now.getMonth() + 1);
        const year = parseInt(req.query.year, 10) || now.getFullYear();

        const monthStr = String(month).padStart(2, "0");
        const datePrefix = `${year}-${monthStr}`;

        const records = await AttendanceHrModal.find({
            employeeId,
            date: { $regex: `^${datePrefix}` }
        }).sort({ date: 1 });

        if (records.length === 0) {
            return res.status(200).json({
                status: true,
                data: [],
                message: `No attendance records found for ${monthStr}/${year}`
            });
        }

        const summary = records.map(r => ({
            date: r.date,
            checkIn: r.checkIn || null,
            checkOut: r.checkOut || null,
            status: r.status,
            overtime: r.overtime || 0,
            remarks: r.remarks || ""
        }));

        return res.status(200).json({ status: true, data: summary });
    } catch (err) {
        return hrmsCatch(res, err, "Attendance summary load failed", "The attendance summary could not be loaded. Please try again.");
    }
};

/**
 * GET /HrESS/loans
 * Active loans for the authenticated employee.
 * Returns outstandingBalance, monthlyInstallment (0 if none), remainingInstallmentCount.
 * Requirement 3.8
 */
export const getLoans = async (req, res) => {
    try {
        const employeeId = getAuthEmployeeId(req);
        if (!employeeId) {
            return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to continue."));
        }

        const loans = await LoanModal.find({ employeeId, status: "active" });

        if (loans.length === 0) {
            return res.status(200).json({
                status: true,
                data: [],
                message: "No active loans found"
            });
        }

        const loanData = loans.map(loan => {
            // Calculate monthly installment and remaining count from amortization schedule
            const pendingEntries = (loan.amortizationSchedule || []).filter(e => e.status === "pending");
            const monthlyInstallment = pendingEntries.length > 0 ? pendingEntries[0].amountToDeduct : 0;
            const remainingInstallmentCount = pendingEntries.length;

            return {
                _id: loan._id,
                loanType: loan.loanType,
                totalAmount: loan.totalAmount,
                outstandingBalance: loan.remainingBalance,
                monthlyInstallment,
                remainingInstallmentCount,
                startDate: loan.startDate,
                description: loan.description
            };
        });

        return res.status(200).json({ status: true, data: loanData });
    } catch (err) {
        return hrmsCatch(res, err, "Loans load failed", "The loans could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrESS/contact
 * Update personal contact fields for the authenticated employee:
 *   phone, address, bankName, bankAccountNumber, emergencyContact.
 * On success: { status: true, message: "Contact updated successfully" }
 * On failure: returns error without losing data.
 * Requirements 3.9, 3.12
 */
export const updateContact = async (req, res) => {
    try {
        const employeeId = getAuthEmployeeId(req);
        if (!employeeId) {
            return res.status(403).json(hrmsBody("Sign in required", "Sign in with an employee account to continue."));
        }

        const { phone, address, bankName, bankAccountNumber, emergencyContact } = req.body;

        // Build update object with only the fields that were provided
        const updateFields = {};
        if (phone !== undefined) updateFields.phone = phone;
        if (address !== undefined) updateFields.address = address;
        if (bankName !== undefined) updateFields.bankName = bankName;
        // Map bankAccountNumber to bankAccount field in schema
        if (bankAccountNumber !== undefined) updateFields.bankAccount = bankAccountNumber;
        if (emergencyContact !== undefined) updateFields.emergencyContact = emergencyContact;

        const updated = await EmployeeHrModal.findByIdAndUpdate(
            employeeId,
            { $set: updateFields },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json(hrmsBody("Employee not found", "No employee exists for this account."));
        }

        return res.status(200).json({ status: true, message: "Contact updated successfully" });
    } catch (err) {
        return hrmsCatch(res, err, "Contact update failed", "The contact could not be updated. Please try again.");
    }
};
