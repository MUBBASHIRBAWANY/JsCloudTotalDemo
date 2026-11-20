import express from "express";
import { CreateEmployee, getAllEmployee, getEmployeeById, updateEmployee, deleteEmployee, getEmployeeNameId, getEmployeesByDepartment, AddEmployeeInBulk, updateSalaryLines } from "../Controllar/EmployeeHrControllar.js";

const EmployeeHrRouter = express.Router()

EmployeeHrRouter.post("/", CreateEmployee)
EmployeeHrRouter.get("/", getAllEmployee)
EmployeeHrRouter.get("/getEmployeeNameId", getEmployeeNameId)
EmployeeHrRouter.get("/getEmployeesByDepartment/:deptId", getEmployeesByDepartment)
EmployeeHrRouter.post("/AddInBulk", AddEmployeeInBulk)
EmployeeHrRouter.put("/salaryLines/:id", updateSalaryLines)
EmployeeHrRouter.get("/:id", getEmployeeById)
EmployeeHrRouter.put("/updateEmployee/:id", updateEmployee)
EmployeeHrRouter.delete("/deleteEmployee/:id", deleteEmployee)

export default EmployeeHrRouter
