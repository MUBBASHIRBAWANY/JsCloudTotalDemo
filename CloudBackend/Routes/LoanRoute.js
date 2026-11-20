import express from "express";
import { CreateLoan, getAllLoans, getLoanById, addRepayment, updateLoan, deleteLoan, getActiveLoansByEmployee } from "../Controllar/LoanControllar.js";

const LoanRouter = express.Router()

LoanRouter.post("/", CreateLoan)
LoanRouter.get("/", getAllLoans)
LoanRouter.get("/active/:empId", getActiveLoansByEmployee)
LoanRouter.get("/:id", getLoanById)
LoanRouter.put("/repayment/:id", addRepayment)
LoanRouter.put("/update/:id", updateLoan)
LoanRouter.delete("/delete/:id", deleteLoan)

export default LoanRouter
