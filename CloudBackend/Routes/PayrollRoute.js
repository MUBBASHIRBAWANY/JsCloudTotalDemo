import express from "express"
import {
    GeneratePayroll, getAllPayroll, getPayrollByEmployee, getPayslip,
    updatePayrollStatus, markSalaryPaid, getMonthStatus, getPayrollSummary,
    processBulk, approveBulk, markPaidBulk, closeBulk, getAuditLog
} from "../Controllar/PayrollControllar.js"

const PayrollRouter = express.Router()

// Existing endpoints
PayrollRouter.post("/generate", GeneratePayroll)
PayrollRouter.get("/", getAllPayroll)
PayrollRouter.get("/summary", getPayrollSummary)
PayrollRouter.get("/monthStatus", getMonthStatus)
PayrollRouter.get("/employee/:id", getPayrollByEmployee)
PayrollRouter.get("/payslip/:id", getPayslip)
PayrollRouter.put("/updateStatus/:id", updatePayrollStatus)
PayrollRouter.post("/markPaid", markSalaryPaid)

// Bulk operations
PayrollRouter.post("/process", processBulk)
PayrollRouter.post("/approve", approveBulk)
PayrollRouter.post("/markPaidBulk", markPaidBulk)
PayrollRouter.post("/close", closeBulk)

// Audit trail
PayrollRouter.get("/audit", getAuditLog)

export default PayrollRouter
