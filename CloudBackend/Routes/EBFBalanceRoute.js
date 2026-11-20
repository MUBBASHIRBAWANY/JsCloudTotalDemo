import express from "express";
import {
    getEBFBalance,
    getEBFTransactions,
    postEBFContribution,
    postBulkEBFContributions,
    getEBFReport
} from "../Controllar/EBFBalanceControllar.js";

const router = express.Router();

router.get("/employee/:employeeId", getEBFBalance);
router.get("/employee/:employeeId/transactions", getEBFTransactions);
router.post("/contribution", postEBFContribution);
router.post("/contribution/bulk", postBulkEBFContributions);
router.get("/report", getEBFReport);

export default router;
