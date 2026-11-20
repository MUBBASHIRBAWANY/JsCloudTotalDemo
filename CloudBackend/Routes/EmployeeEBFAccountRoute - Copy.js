import express from "express"
import { getAllEmployeeEBFAccounts } from "../Controllar/EmployeeEBFAccountControllar.js"

const EmployeeEBFAccountRouter = express.Router()

EmployeeEBFAccountRouter.get("/", getAllEmployeeEBFAccounts)

export default EmployeeEBFAccountRouter
