import express from "express";
import {
    createAdvance,
    getAllAdvances,
    getAdvanceById,
    approveAdvance,
    rejectAdvance,
    cancelAdvance,
    getPendingApprovals,
    getCashierPendingAdvances,
    processPayment,
    getActiveAdvancesForPayroll,
    getRecoveryHistory
} from "../Controllar/SalaryAdvanceControllar.js";

const router = express.Router();

router.post("/", createAdvance);
router.get("/", getAllAdvances);
router.get("/pending", getPendingApprovals);
router.get("/cashier/pending", getCashierPendingAdvances);
router.get("/payroll/active", getActiveAdvancesForPayroll);
router.get("/:id", getAdvanceById);
router.put("/:id/approve", approveAdvance);
router.put("/:id/reject", rejectAdvance);
router.put("/:id/cancel", cancelAdvance);
router.post("/:id/payment", processPayment);
router.get("/recovery/:id", getRecoveryHistory);

export default router;
