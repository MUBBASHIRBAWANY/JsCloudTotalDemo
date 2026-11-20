import express from "express"
import { getAllEmployeeAdvanceAccounts } from "../Controllar/EmployeeAdvanceAccountControllar.js"

const EmployeeAdvanceAccountRouter = express.Router()

EmployeeAdvanceAccountRouter.get("/", getAllEmployeeAdvanceAccounts)

export default EmployeeAdvanceAccountRouter
