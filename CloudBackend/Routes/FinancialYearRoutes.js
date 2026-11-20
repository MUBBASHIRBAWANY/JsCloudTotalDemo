import express from "express";
import {
  GetActiveFinancialYear,
  GetAllFinancialYears,
  SetActiveFinancialYear,
  ValidateDate,
} from "../Controllar/FinancialYearControllar.js";

const FinancialYearRouter = express.Router();

FinancialYearRouter.get("/active", GetActiveFinancialYear);
FinancialYearRouter.get("/all", GetAllFinancialYears);
FinancialYearRouter.put("/set-active/:id", SetActiveFinancialYear);
FinancialYearRouter.post("/validate-date", ValidateDate);

export default FinancialYearRouter;
