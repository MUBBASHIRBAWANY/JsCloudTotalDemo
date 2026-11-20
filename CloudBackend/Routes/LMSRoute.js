import express from "express";
import {
    createCourse,
    createPlan,
    publishPlan,
    completeEnrollment,
    getEmployeeTraining,
    getPlanDashboard,
    exportTrainingReport,
} from "../Controllar/LMSControllar.js";

const LMSRouter = express.Router();

// Course
LMSRouter.post("/course", createCourse);

// Training Plan
LMSRouter.post("/plan", createPlan);
LMSRouter.put("/plan/:id/publish", publishPlan);

// Enrollment completion
LMSRouter.put("/enrollment/:id/complete", completeEnrollment);

// Employee training history
LMSRouter.get("/employee/:empId", getEmployeeTraining);

// Plan completion dashboard
LMSRouter.get("/plan/:id/dashboard", getPlanDashboard);

// CSV export
LMSRouter.get("/export", exportTrainingReport);

export default LMSRouter;
