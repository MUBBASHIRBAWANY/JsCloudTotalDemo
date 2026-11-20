import express from "express";
import {
    createOvertimePolicy,
    getOvertimePolicies,
    updateOvertimePolicy,
    deleteOvertimePolicy
} from "../Controllar/OvertimePolicyControllar.js";

const OvertimePolicyRouter = express.Router();

OvertimePolicyRouter.post("/", createOvertimePolicy);
OvertimePolicyRouter.get("/", getOvertimePolicies);
OvertimePolicyRouter.put("/:id", updateOvertimePolicy);
OvertimePolicyRouter.delete("/:id", deleteOvertimePolicy);

export default OvertimePolicyRouter;
