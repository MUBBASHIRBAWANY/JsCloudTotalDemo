import express from "express";
import { closeMonth, reopenMonth, getMonthsList } from "../Controllar/PayrollMonthControllar.js";

const PayrollMonthRouter = express.Router()

PayrollMonthRouter.post("/close", closeMonth)
PayrollMonthRouter.post("/reopen", reopenMonth)
PayrollMonthRouter.get("/", getMonthsList)

export default PayrollMonthRouter
