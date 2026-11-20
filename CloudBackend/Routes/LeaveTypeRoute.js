import express from "express";
import { createLeaveType, getAllLeaveTypes, updateLeaveType, deleteLeaveType } from "../Controllar/LeaveTypeControllar.js";

const LeaveTypeRouter = express.Router();
LeaveTypeRouter.post("/", createLeaveType);
LeaveTypeRouter.get("/", getAllLeaveTypes);
LeaveTypeRouter.put("/:id", updateLeaveType);
LeaveTypeRouter.delete("/:id", deleteLeaveType);

export default LeaveTypeRouter;
