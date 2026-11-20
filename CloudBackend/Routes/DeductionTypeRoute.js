import express from "express";
import { CreateDeductionType, getAllDeductionType, getDeductionTypeById, updateDeductionType, deleteDeductionType, getDeductionTypeNameId } from "../Controllar/DeductionTypeControllar.js";

const DeductionTypeRouter = express.Router()

DeductionTypeRouter.post("/", CreateDeductionType)
DeductionTypeRouter.get("/", getAllDeductionType)
DeductionTypeRouter.get("/getNameId", getDeductionTypeNameId)
DeductionTypeRouter.get("/:id", getDeductionTypeById)
DeductionTypeRouter.put("/update/:id", updateDeductionType)
DeductionTypeRouter.delete("/delete/:id", deleteDeductionType)

export default DeductionTypeRouter
