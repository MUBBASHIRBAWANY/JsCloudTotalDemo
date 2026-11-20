import express from "express";
import {
    addApplicant,
    advanceStage,
    getApplicantsByPosting
} from "../Controllar/ApplicantControllar.js";

const ApplicantRouter = express.Router();

// POST /HrApplicant — add an applicant to a job posting (Requirements 1.4, 1.5)
ApplicantRouter.post("/HrApplicant", addApplicant);

// PUT /HrApplicant/:id/stage — advance applicant through pipeline stages (Requirements 1.5, 1.6, 1.7, 1.8)
ApplicantRouter.put("/HrApplicant/:id/stage", advanceStage);

// GET /HrApplicant/posting/:postingId — list all applicants for a posting (Requirements 1.4, 1.5)
ApplicantRouter.get("/HrApplicant/posting/:postingId", getApplicantsByPosting);

export default ApplicantRouter;
