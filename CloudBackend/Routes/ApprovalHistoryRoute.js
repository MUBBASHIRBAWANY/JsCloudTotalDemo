import express from "express";
import { getHistoryByLoan, getHistoryByEmployee } from "../Controllar/ApprovalHistoryControllar.js";

const router = express.Router();

router.get("/loan/:loanId", getHistoryByLoan);
router.get("/employee/:employeeId", getHistoryByEmployee);

export default router;
