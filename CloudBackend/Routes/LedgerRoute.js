import express from "express";
import {
    getEmployeeLedger,
    getEBFLedger,
    getLoanLedger,
    createLedgerEntry,
    createReversal
} from "../Controllar/LedgerControllar.js";

const router = express.Router();

router.get("/employee/:employeeId", getEmployeeLedger);
router.get("/employee/:employeeId/ebf", getEBFLedger);
router.get("/employee/:employeeId/loan", getLoanLedger);
router.post("/entry", createLedgerEntry);
router.post("/reversal/:id", createReversal);

export default router;
