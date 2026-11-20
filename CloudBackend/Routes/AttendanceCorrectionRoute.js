import express from "express";
import { submitCorrection, approveCorrection, rejectCorrection, getCorrections } from "../Controllar/AttendanceCorrectionControllar.js";

const AttendanceCorrectionRouter = express.Router();

AttendanceCorrectionRouter.post("/", submitCorrection);
AttendanceCorrectionRouter.get("/", getCorrections);
AttendanceCorrectionRouter.put("/:id/approve", approveCorrection);
AttendanceCorrectionRouter.put("/:id/reject", rejectCorrection);

export default AttendanceCorrectionRouter;
