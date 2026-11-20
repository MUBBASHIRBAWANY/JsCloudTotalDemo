import express from "express";
import {
    CreateAttendance, CheckOut, getAllAttendance, getAttendanceByEmployee,
    getAttendanceByDateRange, UpdateAttendance, bulkCsvUpload, biometricSync,
    getMonthlySummary, getAttendanceRegister, punchPreview, punchImport,
    getAttendanceDashboard, syncFromMachine
} from "../Controllar/AttendanceHrControllar.js";

const AttendanceHrRouter = express.Router()

AttendanceHrRouter.post("/", CreateAttendance)
AttendanceHrRouter.get("/", getAllAttendance)
AttendanceHrRouter.get("/dateRange", getAttendanceByDateRange)
AttendanceHrRouter.get("/employee/:id", getAttendanceByEmployee)
AttendanceHrRouter.put("/checkout/:id", CheckOut)
AttendanceHrRouter.put("/update/:id", UpdateAttendance)
AttendanceHrRouter.post("/bulk-upload", bulkCsvUpload)
AttendanceHrRouter.post("/biometric-sync", biometricSync)
AttendanceHrRouter.post("/punch-preview", punchPreview)
AttendanceHrRouter.post("/punch-import", punchImport)
AttendanceHrRouter.post("/sync-machine", syncFromMachine)
AttendanceHrRouter.get("/summary/:empId/:month/:year", getMonthlySummary)
AttendanceHrRouter.get("/register", getAttendanceRegister)
AttendanceHrRouter.get("/dashboard", getAttendanceDashboard)

export default AttendanceHrRouter
