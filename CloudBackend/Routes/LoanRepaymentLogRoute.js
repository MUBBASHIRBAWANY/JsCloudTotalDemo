import express from "express";
import { getRepaymentLogsByLoan, getRepaymentLogsByEmployee } from "../Controllar/LoanRepaymentLogControllar.js";

const LoanRepaymentLogRouter = express.Router();

LoanRepaymentLogRouter.get("/loan/:loanId", getRepaymentLogsByLoan);
LoanRepaymentLogRouter.get("/employee/:empId", getRepaymentLogsByEmployee);

export default LoanRepaymentLogRouter;
