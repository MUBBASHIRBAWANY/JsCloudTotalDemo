import express from "express";
import { createWorkflow, getAllWorkflows, updateWorkflow, deleteWorkflow } from "../Controllar/ApprovalWorkflowControllar.js";

const ApprovalWorkflowRouter = express.Router();

ApprovalWorkflowRouter.post("/", createWorkflow);
ApprovalWorkflowRouter.get("/", getAllWorkflows);
ApprovalWorkflowRouter.put("/:id", updateWorkflow);
ApprovalWorkflowRouter.delete("/:id", deleteWorkflow);

export default ApprovalWorkflowRouter;
