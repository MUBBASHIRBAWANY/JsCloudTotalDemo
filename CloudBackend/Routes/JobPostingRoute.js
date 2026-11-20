import express from "express";
import {
    createJobPosting,
    getAllJobPostings,
    updateJobPosting,
    getJobPostingStageSummary
} from "../Controllar/JobPostingControllar.js";

const JobPostingRouter = express.Router();

JobPostingRouter.post("/", createJobPosting);
JobPostingRouter.get("/", getAllJobPostings);
JobPostingRouter.put("/:id", updateJobPosting);
JobPostingRouter.get("/:id/stage-summary", getJobPostingStageSummary);

export default JobPostingRouter;
