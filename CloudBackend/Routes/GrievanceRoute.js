import express from "express";
import {
    submitGrievance,
    listGrievances,
    assignInvestigatingOfficer,
    appendInvestigationNote,
    resolveGrievance,
    createDisciplinaryAction,
    getEmployeeDisciplinaryHistory,
} from "../Controllar/GrievanceControllar.js";

const GrievanceRouter = express.Router();

// ── Grievance endpoints ─────────────────────────────────────────────────────

// POST   /HrGrievance          — Submit grievance (Req 10.1, 10.2)
GrievanceRouter.post("/", submitGrievance);

// GET    /HrGrievance          — List grievances with optional status/category filter (Req 10.3, 10.5, 10.8)
GrievanceRouter.get("/", listGrievances);

// PUT    /HrGrievance/:id/assign — Assign investigating officer (Req 10.3, 10.4)
GrievanceRouter.put("/:id/assign", assignInvestigatingOfficer);

// POST   /HrGrievance/:id/note  — Append investigation note (Req 10.4, 10.6)
GrievanceRouter.post("/:id/note", appendInvestigationNote);

// PUT    /HrGrievance/:id/resolve — Record resolution and close (Req 10.5, 10.7)
GrievanceRouter.put("/:id/resolve", resolveGrievance);

// ── Disciplinary endpoints ──────────────────────────────────────────────────

// POST   /HrDisciplinary              — Create disciplinary action (Req 10.10–10.13)
// GET    /HrDisciplinary/employee/:empId — Employee disciplinary history (Req 10.12)
//
// NOTE: These are mounted at /HrGrievance/disciplinary in this router so
// App.js can mount this router at both /HrGrievance and /HrDisciplinary.
// See App.js mounting below.

export default GrievanceRouter;

// ── Separate disciplinary router for /HrDisciplinary mount ─────────────────
const DisciplinaryRouter = express.Router();

DisciplinaryRouter.post("/", createDisciplinaryAction);
DisciplinaryRouter.get("/employee/:empId", getEmployeeDisciplinaryHistory);

export { DisciplinaryRouter };
