import express from "express"
import { getAllEmployeeLoanAccounts } from "../Controllar/EmployeeLoanAccountControllar.js"

const EmployeeLoanAccountRouter = express.Router()

EmployeeLoanAccountRouter.get("/", getAllEmployeeLoanAccounts)

export default EmployeeLoanAccountRouter
