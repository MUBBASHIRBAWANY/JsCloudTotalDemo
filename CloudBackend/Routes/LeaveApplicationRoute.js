import express from "express";
import {
    submitLeave,
    approveLeave,
    rejectLeave,
    encashLeave,
    adjustLeaveBalance,
    getLeaveCalendar,
    getEmployeeLeaves
} from "../Controllar/LeaveApplicationControllar.js";

const LeaveApplicationRouter = express.Router();

// GET /HrLeave/calendar?month=M&year=Y  — must be registered before /:id routes
LeaveApplicationRouter.get("/calendar", getLeaveCalendar);

// GET /HrLeave/employee/:empId
LeaveApplicationRouter.get("/employee/:empId", getEmployeeLeaves);

// POST /HrLeave
LeaveApplicationRouter.post("/", submitLeave);

// PUT /HrLeave/:id/approve
LeaveApplicationRouter.put("/:id/approve", approveLeave);

// PUT /HrLeave/:id/reject
LeaveApplicationRouter.put("/:id/reject", rejectLeave);

// POST /HrLeave/encash/:empId
LeaveApplicationRouter.post("/encash/:empId", encashLeave);

// PUT /HrLeave/adjust/:empId
LeaveApplicationRouter.put("/adjust/:empId", adjustLeaveBalance);

export default LeaveApplicationRouter;
