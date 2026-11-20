import express from "express";
import { CreateDepartment, getAllDepartment, getDepartmentById, updateDepartment, deleteDepartment, getLastDepartment, getDepartmentNameId } from "../Controllar/DepartmentControllar.js";

const DepartmentRouter = express.Router()

DepartmentRouter.post("/", CreateDepartment)
DepartmentRouter.get("/", getAllDepartment)
DepartmentRouter.get("/lastDepartment", getLastDepartment)
DepartmentRouter.get("/getDepartmentNameId", getDepartmentNameId)
DepartmentRouter.get("/:id", getDepartmentById)
DepartmentRouter.put("/updateDepartment/:id", updateDepartment)
DepartmentRouter.delete("/deleteDepartment/:id", deleteDepartment)

export default DepartmentRouter
