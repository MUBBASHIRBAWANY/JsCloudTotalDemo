import express from "express";
import { CreateSalaryHistory, getSalaryHistoryByEmployee } from "../Controllar/SalaryHistoryControllar.js";

const SalaryHistoryRouter = express.Router()

SalaryHistoryRouter.post("/", CreateSalaryHistory)
SalaryHistoryRouter.get("/employee/:empId", getSalaryHistoryByEmployee)

export default SalaryHistoryRouter
