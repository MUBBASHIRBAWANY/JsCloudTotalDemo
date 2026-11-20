import express from "express";
import { createLeavePolicy, getAllLeavePolicies, updateLeavePolicy, deleteLeavePolicy, getPoliciesForEmployee } from "../Controllar/LeavePolicyControllar.js";

const LeavePolicyRouter = express.Router();
LeavePolicyRouter.post("/", createLeavePolicy);
LeavePolicyRouter.get("/", getAllLeavePolicies);
LeavePolicyRouter.get("/for-employee", getPoliciesForEmployee);
LeavePolicyRouter.put("/:id", updateLeavePolicy);
LeavePolicyRouter.delete("/:id", deleteLeavePolicy);

export default LeavePolicyRouter;
