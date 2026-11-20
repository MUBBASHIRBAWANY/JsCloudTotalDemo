import express from "express";
import {
    createLoan,
    getAllLoans,
    getLoanById,
    approveLoan,
    rejectLoan,
    cancelLoan,
    getPendingApprovals,
    getEBFBalance,
    getDisbursementPendingLoans,
    disburseLoan,
    getActiveLoansForPayroll
} from "../Controllar/StaffLoanControllar.js";

const router = express.Router();

router.post("/", createLoan);
router.get("/", getAllLoans);
router.get("/pending", getPendingApprovals);
router.get("/disbursement/pending", getDisbursementPendingLoans);
router.get("/payroll/active", getActiveLoansForPayroll);
router.get("/employee/:employeeId/ebf", getEBFBalance);
router.get("/:id", getLoanById);
router.put("/:id/approve", approveLoan);
router.put("/:id/reject", rejectLoan);
router.put("/:id/cancel", cancelLoan);
router.post("/:id/disburse", disburseLoan);

export default router;
