import express from "express"
import { getAllEmployeeBadDebtAccounts } from "../Controllar/EmployeeBadDebtAccountControllar.js"

const EmployeeBadDebtAccountRouter = express.Router()

EmployeeBadDebtAccountRouter.get("/", getAllEmployeeBadDebtAccounts)

export default EmployeeBadDebtAccountRouter
