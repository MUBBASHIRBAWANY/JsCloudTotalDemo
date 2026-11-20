import express from "express";
import { lockMonth, unlockMonth, getMonthLockStatus } from "../Controllar/AttendanceMonthLockControllar.js";

const AttendanceMonthLockRouter = express.Router();

AttendanceMonthLockRouter.post("/lock", lockMonth);
AttendanceMonthLockRouter.post("/unlock", unlockMonth);
AttendanceMonthLockRouter.get("/", getMonthLockStatus);

export default AttendanceMonthLockRouter;
