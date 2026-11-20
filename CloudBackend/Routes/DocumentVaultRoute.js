import express from "express";
import {
    uploadDocument,
    listDocumentsByEmployee,
    replaceDocumentVersion,
    getExpiryAlerts,
    exportDocumentsByDepartment,
} from "../Controllar/DocumentVaultControllar.js";

const DocumentVaultRouter = express.Router();

/**
 * Static routes MUST come before parameterised routes so that
 * Express does not match "expiry-alerts" or "export" as :empId / :docId.
 */

// GET /HrDocument/expiry-alerts  — all expiring / expired docs (Requirements 9.4, 9.5, 9.6)
DocumentVaultRouter.get("/expiry-alerts", getExpiryAlerts);

// GET /HrDocument/export         — CSV export by department (Requirements 9.7)
DocumentVaultRouter.get("/export", exportDocumentsByDepartment);

// POST /HrDocument/:empId        — upload a new document (Requirements 9.1, 9.2)
DocumentVaultRouter.post("/:empId", uploadDocument);

// GET  /HrDocument/:empId        — list employee documents with optional ?type= filter (Requirements 9.6)
DocumentVaultRouter.get("/:empId", listDocumentsByEmployee);

// PUT  /HrDocument/:docId/replace — upload a new version, FIFO trim (Requirements 9.3)
DocumentVaultRouter.put("/:docId/replace", replaceDocumentVersion);

export default DocumentVaultRouter;
