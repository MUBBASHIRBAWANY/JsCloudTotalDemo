import PayrollModal from "../Modal/PayrollModal.js"
import EmployeeHrModal from "../Modal/EmployeeHrModal.js"
import PayrollAuditLog from "../Modal/PayrollAuditLog.js"
import { calculateMonthlyPayroll } from "../engine/PayrollEngine.js"
import { closePayroll, bulkClosePayroll } from "../engine/PayrollClosingEngine.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


async function logAction(payrollId, employeeId, action, userId, month, year, details = "", ip = "") {
    await PayrollAuditLog.create({
        payrollId, employeeId, action,
        performedBy: userId,
        month, year, details, ipAddress: ip
    })
}

async function bulkStatusTransition(payrollIds, targetStatus, userId, ip) {
    const results = { processed: 0, skipped: 0, failed: 0, errors: [] }
    const timestampField = `${targetStatus}At`
    const userField = `${targetStatus}By`

    const validFrom = {
        processed: ["draft"],
        approved: ["processed"],
        paid: ["approved"]
    }

    for (const id of payrollIds) {
        try {
            const record = await PayrollModal.findById(id)
            if (!record) { results.failed++; results.errors.push({ id, error: "Payroll record not found: No payroll record exists for this id." }); continue }

            if (!validFrom[targetStatus]?.includes(record.status)) {
                results.skipped++; continue
            }

            record.status = targetStatus
            record[timestampField] = new Date()
            record[userField] = userId
            await record.save()

            await logAction(record._id, record.employeeId, targetStatus, userId, record.month, record.year, "", ip)
            results.processed++
        } catch (err) {
            results.failed++
            results.errors.push({ id, error: err.message })
        }
    }
    return results
}

export const GeneratePayroll = async (req, res) => {
    try {
        const { month, year, employeeIds } = req.body
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }

        const query = { status: "active" }
        if (employeeIds && employeeIds.length > 0) {
            query._id = { $in: employeeIds }
        }
        const employees = await EmployeeHrModal.find(query)
        const results = []

        for (const emp of employees) {
            const existing = await PayrollModal.findOne({ employeeId: emp._id, month, year })
            if (existing) continue

            const payrollData = await calculateMonthlyPayroll(emp._id, month, year)
            if (!payrollData) continue

            const payroll = await PayrollModal.create(payrollData)
            results.push(payroll)
        }

        const userId = req.user?._id
        for (const p of results) {
            await logAction(p._id, p.employeeId, "generated", userId, month, year, "", req.ip)
        }

        res.status(200).send({
            status: true,
            data: {
                generated: results.length,
                skipped: employees.length - results.length,
                failed: 0,
                totalEmployees: employees.length
            }
        })
    } catch (err) {
        return hrmsCatch(res, err, "Payroll generation failed", "Payroll could not be generated. Please try again.");
    }
}

export const getAllPayroll = async (req, res) => {
    try {
        const query = {}
        if (req.query.month) query.month = parseInt(req.query.month)
        if (req.query.year) query.year = parseInt(req.query.year)
        if (req.query.status) query.status = req.query.status
        const data = await PayrollModal.find(query)
            .populate("employeeId", "firstName lastName code departmentId designationId")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Payroll list failed", "Payrolls could not be loaded. Please try again.");
    }
}

export const getPayrollByEmployee = async (req, res) => {
    try {
        const data = await PayrollModal.find({ employeeId: req.params.id }).sort({ year: -1, month: -1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Payroll load failed", "The payroll could not be loaded. Please try again.");
    }
}

export const getPayslip = async (req, res) => {
    try {
        const data = await PayrollModal.findById(req.params.id)
            .populate({
                path: "employeeId",
                populate: [
                    { path: "departmentId", select: "name" },
                    { path: "designationId", select: "name" }
                ]
            })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Payslip load failed", "The payslip could not be loaded. Please try again.");
    }
}

export const updatePayrollStatus = async (req, res) => {
    try {
        const { status } = req.body
        const record = await PayrollModal.findById(req.params.id)
        if (!record) return hrmsFail(res, 404, "Record not found", "The requested record was not found.")

        const validTransitions = {
            processed: ["draft"],
            approved: ["processed"],
            paid: ["approved"],
            closed: ["paid"],
            draft: ["processed"],
            processed: ["approved"]
        }
        if (!validTransitions[status]?.includes(record.status)) {
            return res.status(400).send({ status: false, message: `Cannot transition from "${record.status}" to "${status}"` })
        }

        record.status = status
        const timestampField = `${status}At`
        const userField = `${status}By`
        record[timestampField] = new Date()
        if (req.user?._id) record[userField] = req.user._id
        await record.save()

        await logAction(record._id, record.employeeId, status, req.user?._id, record.month, record.year, "", req.ip)

        res.status(200).send({ status: true, data: record })
    } catch (err) {
        return hrmsCatch(res, err, "Payroll status update failed", "The payroll status could not be updated. Please try again.");
    }
}

export const markSalaryPaid = async (req, res) => {
    try {
        const { payrollIds, paymentMethod, paymentReference, bankAccount, paymentDate } = req.body
        if (!payrollIds || payrollIds.length === 0) {
            return hrmsFail(res, 400, "Missing fields", "At least one payroll record is required.")
        }

        const updated = []
        for (const pid of payrollIds) {
            const doc = await PayrollModal.findById(pid)
            if (!doc || doc.status !== "approved") continue

            doc.status = "paid"
            doc.paidAt = new Date()
            doc.paidBy = req.user?._id
            doc.paymentMethod = paymentMethod || "bank_transfer"
            doc.paymentReference = paymentReference || ""
            doc.bankAccount = bankAccount || ""
            doc.paymentDate = paymentDate ? new Date(paymentDate) : new Date()
            await doc.save()

            await logAction(doc._id, doc.employeeId, "paid", req.user?._id, doc.month, doc.year, `Method: ${doc.paymentMethod}`, req.ip)
            updated.push(doc)
        }

        res.status(200).send({ status: true, data: updated })
    } catch (err) {
        return hrmsCatch(res, err, "Salary paid update failed", "The salary paid could not be updated. Please try again.");
    }
}

export const getMonthStatus = async (req, res) => {
    try {
        const { month, year } = req.query
        if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        const records = await PayrollModal.find({ month: parseInt(month), year: parseInt(year) })
        const counts = { total: records.length, draft: 0, processed: 0, approved: 0, paid: 0, closed: 0 }
        for (const r of records) counts[r.status] = (counts[r.status] || 0) + 1
        res.status(200).send({ status: true, data: { ...counts, allClosed: counts.total > 0 && counts.closed === counts.total } })
    } catch (err) {
        return hrmsCatch(res, err, "Month status load failed", "The month status could not be loaded. Please try again.");
    }
}

export const getPayrollSummary = async (req, res) => {
    try {
        const { month, year } = req.query
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }
        const summary = await PayrollModal.aggregate([
            { $match: { month: parseInt(month), year: parseInt(year) } },
            { $lookup: { from: "hremployees", localField: "employeeId", foreignField: "_id", as: "employee" } },
            { $unwind: "$employee" },
            { $lookup: { from: "hrdepartments", localField: "employee.departmentId", foreignField: "_id", as: "department" } },
            { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },
            { $group: {
                _id: "$department.name",
                totalEmployees: { $sum: 1 },
                totalBasicSalary: { $sum: "$basicSalary" },
                totalGrossSalary: { $sum: "$grossSalary" },
                totalNetSalary: { $sum: "$netSalary" },
                totalDeductions: { $sum: "$totalDeductions" }
            }},
            { $sort: { _id: 1 } }
        ])
        const totalSummary = await PayrollModal.aggregate([
            { $match: { month: parseInt(month), year: parseInt(year) } },
            { $group: {
                _id: null,
                totalEmployees: { $sum: 1 },
                totalBasicSalary: { $sum: "$basicSalary" },
                totalGrossSalary: { $sum: "$grossSalary" },
                totalNetSalary: { $sum: "$netSalary" },
                totalDeductions: { $sum: "$totalDeductions" }
            }}
        ])
        res.status(200).send({
            status: true,
            data: {
                byDepartment: summary,
                total: totalSummary[0] || { totalEmployees: 0, totalBasicSalary: 0, totalGrossSalary: 0, totalNetSalary: 0, totalDeductions: 0 }
            }
        })
    } catch (err) {
        return hrmsCatch(res, err, "Payroll summary load failed", "The payroll summary could not be loaded. Please try again.");
    }
}

// ─── BULK OPERATIONS ─────────────────────────────────────────────

export const processBulk = async (req, res) => {
    try {
        const { payrollIds, month, year } = req.body
        let ids = payrollIds

        if (!ids || ids.length === 0) {
            if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Choose payroll records, or provide a month and year.")
            const drafts = await PayrollModal.find({ month: parseInt(month), year: parseInt(year), status: "draft" })
            ids = drafts.map(d => d._id)
        }

        const result = await bulkStatusTransition(ids, "processed", req.user?._id, req.ip)
        res.status(200).send({ status: true, data: result })
    } catch (err) {
        return hrmsCatch(res, err, "Bulk update failed", "The bulk could not be updated. Please try again.");
    }
}

export const approveBulk = async (req, res) => {
    try {
        const { payrollIds, month, year } = req.body
        let ids = payrollIds

        if (!ids || ids.length === 0) {
            if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Choose payroll records, or provide a month and year.")
            const records = await PayrollModal.find({ month: parseInt(month), year: parseInt(year), status: "processed" })
            ids = records.map(d => d._id)
        }

        const result = await bulkStatusTransition(ids, "approved", req.user?._id, req.ip)
        res.status(200).send({ status: true, data: result })
    } catch (err) {
        return hrmsCatch(res, err, "Bulk update failed", "The bulk could not be updated. Please try again.");
    }
}

export const markPaidBulk = async (req, res) => {
    try {
        const { payrollIds, month, year, paymentMethod, paymentReference, bankAccount, paymentDate } = req.body
        let ids = payrollIds

        if (!ids || ids.length === 0) {
            if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Choose payroll records, or provide a month and year.")
            const records = await PayrollModal.find({ month: parseInt(month), year: parseInt(year), status: "approved" })
            ids = records.map(d => d._id)
        }

        const results = { processed: 0, skipped: 0, failed: 0, errors: [] }
        for (const id of ids) {
            try {
                const record = await PayrollModal.findById(id)
                if (!record || record.status !== "approved") { results.skipped++; continue }

                record.status = "paid"
                record.paidAt = new Date()
                record.paidBy = req.user?._id
                record.paymentMethod = paymentMethod || "bank_transfer"
                record.paymentReference = paymentReference || ""
                record.bankAccount = bankAccount || ""
                record.paymentDate = paymentDate ? new Date(paymentDate) : new Date()
                await record.save()

                await logAction(record._id, record.employeeId, "paid", req.user?._id, record.month, record.year, `Method: ${record.paymentMethod}`, req.ip)
                results.processed++
            } catch (err) {
                results.failed++
                results.errors.push({ id, error: err.message })
            }
        }

        res.status(200).send({ status: true, data: results })
    } catch (err) {
        return hrmsCatch(res, err, "Paid bulk update failed", "The paid bulk could not be updated. Please try again.");
    }
}

export const closeBulk = async (req, res) => {
    try {
        const { month, year } = req.body
        if (!month || !year) return hrmsFail(res, 400, "Missing fields", "Month and year are required.")

        const result = await bulkClosePayroll([], req.user?._id, req.ip, parseInt(month), parseInt(year))
        res.status(200).send({ status: true, data: result })
    } catch (err) {
        return hrmsCatch(res, err, "Bulk update failed", "The bulk could not be updated. Please try again.");
    }
}

export const getAuditLog = async (req, res) => {
    try {
        const query = {}
        if (req.query.month) query.month = parseInt(req.query.month)
        if (req.query.year) query.year = parseInt(req.query.year)
        if (req.query.action) query.action = req.query.action
        if (req.query.payrollId) query.payrollId = req.query.payrollId

        const data = await PayrollAuditLog.find(query)
            .populate("employeeId", "firstName lastName code")
            .populate("performedBy", "firstName lastName")
            .sort({ createdAt: -1 })
            .limit(500)

        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Audit log load failed", "The audit log could not be loaded. Please try again.");
    }
}
