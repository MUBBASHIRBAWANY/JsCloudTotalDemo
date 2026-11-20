import express from "express";
import { createEarningDeductionCode, getAllEarningDeductionCode, getEarningDeductionCodeById, updateEarningDeductionCode, deleteEarningDeductionCode, getActiveEarningDeductionCode } from "../Controllar/EarningDeductionCodeControllar.js";

const EarningDeductionCodeRouter = express.Router()

EarningDeductionCodeRouter.post("/", createEarningDeductionCode)
EarningDeductionCodeRouter.get("/", getAllEarningDeductionCode)
EarningDeductionCodeRouter.get("/active", getActiveEarningDeductionCode)
EarningDeductionCodeRouter.get("/:id", getEarningDeductionCodeById)
EarningDeductionCodeRouter.put("/update/:id", updateEarningDeductionCode)
EarningDeductionCodeRouter.delete("/delete/:id", deleteEarningDeductionCode)

export default EarningDeductionCodeRouter
