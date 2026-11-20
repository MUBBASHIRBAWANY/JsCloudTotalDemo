import express from "express";
import { CreateAllowanceType, getAllAllowanceType, getAllowanceTypeById, updateAllowanceType, deleteAllowanceType, getAllowanceTypeNameId } from "../Controllar/AllowanceTypeControllar.js";

const AllowanceTypeRouter = express.Router()

AllowanceTypeRouter.post("/", CreateAllowanceType)
AllowanceTypeRouter.get("/", getAllAllowanceType)
AllowanceTypeRouter.get("/getNameId", getAllowanceTypeNameId)
AllowanceTypeRouter.get("/:id", getAllowanceTypeById)
AllowanceTypeRouter.put("/update/:id", updateAllowanceType)
AllowanceTypeRouter.delete("/delete/:id", deleteAllowanceType)

export default AllowanceTypeRouter
