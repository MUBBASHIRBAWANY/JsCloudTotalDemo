import express from "express";
import {
    getOnboardingChecklist,
    updateOnboardingTask
} from "../Controllar/OnboardingControllar.js";

const OnboardingRouter = express.Router();

// GET /HrOnboarding/:employeeId — get onboarding checklist for an employee (Requirements 1.8, 1.9)
OnboardingRouter.get("/HrOnboarding/:employeeId", getOnboardingChecklist);

// PUT /HrOnboarding/:id/task — update a task's completion status; auto-completes checklist (Requirements 1.9, 1.10)
OnboardingRouter.put("/HrOnboarding/:id/task", updateOnboardingTask);

export default OnboardingRouter;
