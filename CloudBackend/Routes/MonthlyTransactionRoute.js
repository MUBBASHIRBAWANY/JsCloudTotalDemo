import express from "express";
import { createTransaction, getByEmployeeMonth, getByMonth, updateTransaction, deleteTransaction } from "../Controllar/MonthlyTransactionControllar.js";

const MonthlyTransactionRouter = express.Router()

MonthlyTransactionRouter.post("/", createTransaction)
MonthlyTransactionRouter.get("/", getByMonth)
MonthlyTransactionRouter.get("/employee/:empId", getByEmployeeMonth)
MonthlyTransactionRouter.put("/update/:id", updateTransaction)
MonthlyTransactionRouter.delete("/delete/:id", deleteTransaction)

export default MonthlyTransactionRouter
