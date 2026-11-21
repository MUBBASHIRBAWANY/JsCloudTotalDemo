import EmployeeDocumentModal from "../Modal/EmployeeDocumentModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


// ─── Constants ────────────────────────────────────────────────────────────────

/** Accepted file format extensions (case-insensitive). Requirements 9.2 */
const ACCEPTED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "docx"];

/** Maximum file size in bytes (10 MB). Requirements 9.2 */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum number of version history entries. Requirements 9.3 */
const MAX_VERSIONS = 10;

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Determine whether the calling user has HR access.
 * If req.user is available and role is "HR_Manager" → HR access.
 * Otherwise falls back to false (non-HR).
 * Requirements 9.8 (cross-access guard)
 */
function isHRUser(req) {
    return req.user && req.user.role === "HR_Manager";
}

/**
 * Validate uploaded file metadata present in req.body:
 *   - fileExtension (derived from fileRef path/name) must be in ACCEPTED_EXTENSIONS
 *   - fileSizeBytes must be ≤ MAX_FILE_SIZE_BYTES if provided
 * Returns an error string when invalid, null otherwise.
 * Requirements 9.2
 */
function validateFileConstraints(fileRef, fileSizeBytes) {
    // Derive extension from the fileRef string (URL or storage path)
    const ext = (fileRef.split(".").pop() || "").toLowerCase().replace(/\?.*$/, "");
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        return `File format not accepted. Allowed: ${ACCEPTED_EXTENSIONS.join(", ").toUpperCase()}`;
    }
    if (fileSizeBytes != null && Number(fileSizeBytes) > MAX_FILE_SIZE_BYTES) {
        return "File size exceeds the 10 MB limit";
    }
    return null;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /HrDocument/:empId
 * Upload (create) a new document record for an employee.
 *
 * Body fields:
 *   - documentType  (required) — enum value from EmployeeDocumentModal
 *   - fileRef       (required) — URL or storage path; extension validated
 *   - documentTitle (optional, max 150 chars)
 *   - issueDate, expiryDate, notes (optional)
 *   - fileSizeBytes (optional) — if provided, must not exceed 10 MB
 *
 * Cross-access guard: non-HR users may only upload for their own employeeId.
 * Requirements 9.1, 9.2, 9.8
 */
export const uploadDocument = async (req, res) => {
    try {
        const { empId } = req.params;

        // Cross-access guard — Requirements 9.8
        if (!isHRUser(req) && req.user && String(req.user.employeeId) !== String(empId)) {
            return res.status(403).json({
                status: false,
                error: "Access denied. You may only manage your own documents."
            });
        }

        // Required field validation — Requirements 9.1
        const validationError = validateRequired(req.body, ["documentType", "fileRef"]);
        if (validationError) {
            return res.status(400).json(validationError);
        }

        const { fileRef, fileSizeBytes, documentTitle } = req.body;

        // documentTitle length guard
        if (documentTitle && documentTitle.length > 150) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: ["documentTitle must not exceed 150 characters"]
            });
        }

        // File format / size validation — Requirements 9.2
        const fileError = validateFileConstraints(fileRef, fileSizeBytes);
        if (fileError) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: [fileError]
            });
        }

        const document = await EmployeeDocumentModal.create({
            ...req.body,
            employeeId: empId,
            versions: []
        });

        return res.status(200).json({ status: true, data: document });
    } catch (err) {
        return hrmsCatch(res, err, "Upload document failed", "The upload document could not be completed. Please try again.");
    }
};

/**
 * GET /HrDocument/:empId
 * List all documents for an employee with optional ?type= filter.
 *
 * Cross-access guard: non-HR users may only list their own documents.
 * Requirements 9.6, 9.8
 */
export const listDocumentsByEmployee = async (req, res) => {
    try {
        const { empId } = req.params;
        const { type } = req.query;

        // Cross-access guard — Requirements 9.8
        if (!isHRUser(req) && req.user && String(req.user.employeeId) !== String(empId)) {
            return res.status(403).json({
                status: false,
                error: "Access denied. You may only view your own documents."
            });
        }

        const filter = { employeeId: empId };
        if (type) {
            filter.documentType = type;
        }

        const documents = await EmployeeDocumentModal.find(filter).sort({ createdAt: -1 });

        return res.status(200).json({ status: true, data: documents });
    } catch (err) {
        return hrmsCatch(res, err, "Documents load failed", "The documents could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrDocument/:docId/replace
 * Replace the current file of a document — pushes the old fileRef into versions
 * (FIFO trim to MAX_VERSIONS = 10) then updates the document's fileRef.
 *
 * Body: { fileRef, fileSizeBytes? }
 *
 * Cross-access guard: non-HR users may only replace their own documents.
 * Requirements 9.3, 9.8
 */
export const replaceDocumentVersion = async (req, res) => {
    try {
        const { docId } = req.params;
        const { fileRef, fileSizeBytes } = req.body;

        if (!fileRef) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: ["fileRef is required for version replacement"]
            });
        }

        const document = await EmployeeDocumentModal.findById(docId);
        if (!document) {
            return res.status(404).json({ status: false, error: "Document not found", details: ["No document exists for this id."] });
        }

        // Cross-access guard — Requirements 9.8
        if (!isHRUser(req) && req.user && String(req.user.employeeId) !== String(document.employeeId)) {
            return res.status(403).json({
                status: false,
                error: "Access denied. You may only modify your own documents."
            });
        }

        // File format / size validation — Requirements 9.2
        const fileError = validateFileConstraints(fileRef, fileSizeBytes);
        if (fileError) {
            return res.status(400).json({
                status: false,
                error: "Validation failed",
                details: [fileError]
            });
        }

        // Push current fileRef into versions history — Requirements 9.3
        const newVersionEntry = { fileRef: document.fileRef, replacedAt: new Date() };

        // FIFO: if already at max capacity, remove the oldest entry first
        if (document.versions.length >= MAX_VERSIONS) {
            // Remove element at index 0 (oldest) — $pop: -1 equivalent via pull or splice
            await EmployeeDocumentModal.findByIdAndUpdate(docId, { $pop: { versions: -1 } });
        }

        // Push new version entry and update current fileRef atomically
        const updated = await EmployeeDocumentModal.findByIdAndUpdate(
            docId,
            {
                $push: { versions: newVersionEntry },
                $set:  { fileRef }
            },
            { new: true }
        );

        return res.status(200).json({ status: true, data: updated });
    } catch (err) {
        return hrmsCatch(res, err, "Replace document version failed", "The replace document version could not be completed. Please try again.");
    }
};

/**
 * GET /HrDocument/expiry-alerts
 * Return all documents that are "expiring-soon" or "expired".
 * HR-only endpoint — the virtual `expiryStatus` is computed from the model.
 *
 * Requirements 9.4, 9.5, 9.6
 */
export const getExpiryAlerts = async (req, res) => {
    try {
        const today = new Date();
        const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        // 30 days from today (midnight), exclusive boundary — "< 30 days" means before this date
        const alertThreshold = new Date(todayMidnight.getTime() + 30 * 24 * 60 * 60 * 1000);

        // Documents where expiryDate exists AND expiryDate < alertThreshold (covers both "expiring-soon" and "expired")
        const documents = await EmployeeDocumentModal.find({
            expiryDate: { $exists: true, $lt: alertThreshold }
        })
            .populate("employeeId", "firstName lastName employeeCode departmentId")
            .sort({ expiryDate: 1 });

        // Annotate each document with its expiryStatus virtual (already computed by model)
        const annotated = documents.map((doc) => {
            const obj = doc.toJSON();
            return obj;
        });

        return res.status(200).json({ status: true, data: annotated });
    } catch (err) {
        return hrmsCatch(res, err, "Expiry alerts load failed", "The expiry alerts could not be loaded. Please try again.");
    }
};

/**
 * GET /HrDocument/export
 * Export all employee documents grouped by department as CSV.
 * Query params: ?department= (optional filter)
 *
 * CSV columns: Employee Name, Employee Code, Department, Document Type,
 *              Document Title, Issue Date, Expiry Date, Expiry Status, File Ref
 *
 * Requirements 9.7
 */
export const exportDocumentsByDepartment = async (req, res) => {
    try {
        const { department } = req.query;

        // Build employee filter
        const employeeFilter = {};
        if (department) {
            employeeFilter.departmentId = department;
        }

        const employees = await EmployeeHrModal.find(employeeFilter, {
            _id: 1,
            firstName: 1,
            lastName: 1,
            employeeCode: 1,
            departmentId: 1
        }).populate("departmentId", "name");

        const employeeMap = {};
        const employeeIds = employees.map((e) => {
            employeeMap[String(e._id)] = {
                name:       `${e.firstName || ""} ${e.lastName || ""}`.trim(),
                code:       e.employeeCode || "",
                department: e.departmentId ? (e.departmentId.name || String(e.departmentId)) : ""
            };
            return e._id;
        });

        const documents = await EmployeeDocumentModal.find({
            employeeId: { $in: employeeIds }
        }).sort({ employeeId: 1, documentType: 1 });

        const headers = [
            "Employee Name",
            "Employee Code",
            "Department",
            "Document Type",
            "Document Title",
            "Issue Date",
            "Expiry Date",
            "Expiry Status",
            "File Ref"
        ];

        const rows = documents.map((doc) => {
            const emp = employeeMap[String(doc.employeeId)] || { name: "", code: "", department: "" };
            const docObj = doc.toJSON(); // includes virtuals
            const fields = [
                emp.name,
                emp.code,
                emp.department,
                doc.documentType,
                doc.documentTitle || "",
                doc.issueDate  ? doc.issueDate.toISOString().split("T")[0]  : "",
                doc.expiryDate ? doc.expiryDate.toISOString().split("T")[0] : "",
                docObj.expiryStatus || "",
                doc.fileRef
            ];
            return fields.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(",");
        });

        const csv = [headers.join(","), ...rows].join("\n");

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", 'attachment; filename="document-vault-export.csv"');
        return res.status(200).send(csv);
    } catch (err) {
        return hrmsCatch(res, err, "Documents by department load failed", "The documents by department could not be loaded. Please try again.");
    }
};
