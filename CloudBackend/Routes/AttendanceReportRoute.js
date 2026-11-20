import express from "express";
import { dailyReport, monthlyReport, lateReport, leaveBalanceReport } from "../Controllar/AttendanceReportControllar.js";

const AttendanceReportRouter = express.Router();

AttendanceReportRouter.get("/daily", dailyReport);
AttendanceReportRouter.get("/monthly", monthlyReport);
AttendanceReportRouter.get("/late", lateReport);
AttendanceReportRouter.get("/leave-balance", leaveBalanceReport);

export default AttendanceReportRouter;
