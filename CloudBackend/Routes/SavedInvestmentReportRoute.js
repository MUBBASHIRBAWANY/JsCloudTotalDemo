import express from "express";
import { getLatestReport, saveReport } from "../Controllar/SavedInvestmentReportControllar.js";

const SavedInvestmentReportRouter = express.Router()

SavedInvestmentReportRouter.get("/latest", getLatestReport)
SavedInvestmentReportRouter.get("/fromDate/:date", getLatestReport)
SavedInvestmentReportRouter.post("/save", saveReport)

export default SavedInvestmentReportRouter
