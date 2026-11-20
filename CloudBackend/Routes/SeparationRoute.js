import express from "express";
import {
    initiateSeparation,
    getSeparationById,
    updateClearanceTask,
    previewSettlement,
    confirmSettlement,
    getSeparationHistory
} from "../Controllar/SeparationControllar.js";

const SeparationRouter = express.Router();

/**
 * GET /HrSeparation/history — Full separation history (Requirement 7.10)
 *
 * NOTE: This route is declared BEFORE /:id routes so Express does not
 * interpret the literal string "history" as an :id parameter.
 */
SeparationRouter.get("/history", getSeparationHistory);

// POST /HrSeparation — Initiate separation request (Requirement 7.1–7.3, 7.9)
SeparationRouter.post("/", initiateSeparation);

// GET /HrSeparation/:id — Get separation details with clearance checklist
SeparationRouter.get("/:id", getSeparationById);

// PUT /HrSeparation/:id/clearance/task — Update a clearance task (Requirement 7.4, 7.5)
SeparationRouter.put("/:id/clearance/task", updateClearanceTask);

// GET /HrSeparation/:id/settlement — Preview final settlement (Requirement 7.5, 7.6)
SeparationRouter.get("/:id/settlement", previewSettlement);

// POST /HrSeparation/:id/settlement/confirm — Confirm settlement (Requirement 7.7, 7.8)
SeparationRouter.post("/:id/settlement/confirm", confirmSettlement);

export default SeparationRouter;
