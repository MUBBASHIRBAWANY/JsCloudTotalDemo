import express from "express";
import { CreateAdjustment, getAllAdjustments, deleteAdjustment, getAdjustmentsByEmployee } from "../Controllar/PayrollAdjustmentControllar.js";

const PayrollAdjustmentRouter = express.Router()

PayrollAdjustmentRouter.post("/", CreateAdjustment)
PayrollAdjustmentRouter.get("/", getAllAdjustments)
PayrollAdjustmentRouter.delete("/delete/:id", deleteAdjustment)
PayrollAdjustmentRouter.get("/employee/:empId", getAdjustmentsByEmployee)

export default PayrollAdjustmentRouter
