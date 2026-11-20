import GrievanceModal from "../modal/GrievanceModal.js";
import DisciplinaryActionModal from "../modal/DisciplinaryActionModal.js";
import SeparationRequestModal from "../modal/SeparationRequestModal.js";
import EmployeeHrModal from "../modal/EmployeeHrModal.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate the next grievance reference number: GRV-YYYY-NNNN
 * Sequence is the count of grievances already filed in the current year + 1.
 * Requirement 10.2
 */
async function generateReferenceNumber() {
    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd   = new Date(year + 1, 0, 1);

    const count = await GrievanceModal.countDocuments({
        submissionDate: { $gte: yearStart, $lt: yearEnd }
    });

    const sequence = count + 1;
    return `GRV-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Attach the requestor role to each grievance document so the toJSON
 * transform can strip complainantEmployeeId for anonymous records when
 * the requestor is not HR_Manager. (Requirement 10.6 / 10.9)
 */
function attachRole(docs, role) {
    if (!docs) return docs;
    const items = Array.isArray(docs) ? docs : [docs];
    items.forEach(doc => {
        if (doc && typeof doc === "object") {
            doc._requestorRole = role;
        }
    });
    return docs;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grievance Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /HrGrievance
 * Submit a new grievance.
 * Requirements 10.1, 10.2, 10.3
 */
export const submitGrievance = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["subject", "category"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        // Non-HR employees must provide their own employeeId (or it is inferred
        // from the auth token). HR_Managers can submit on behalf of others.
        const requestorRole       = req.user?.role ?? "";
        const requestorEmployeeId = req.user?.employeeId ?? null;

        const {
            subject,
            category,
            description,
            isAnonymous = false,
            complainantEmployeeId
        } = req.body;

        // Determine complainant
        const resolvedComplainantId =
            complainantEmployeeId ??
            requestorEmployeeId ??
            null;

        const referenceNumber = await generateReferenceNumber();

        const grievance = await GrievanceModal.create({
            referenceNumber,
            complainantEmployeeId: resolvedComplainantId,
            isAnonymous,
            subject,
            category,
            description,
            status: "submitted",
            submissionDate: new Date()
        });

        // Attach role for toJSON anonymous stripping
        grievance._requestorRole = requestorRole;

        return res.status(200).send({ status: true, data: grievance.toJSON() });
    } catch (err) {
        return hrmsCatch(res, err, "Grievance update failed", "The grievance could not be updated. Please try again.");
    }
};

/**
 * GET /HrGrievance
 * List grievances. HR_Manager can see all and filter by status/category.
 * Non-HR employees can only see their own records.
 * Requirements 10.3, 10.5, 10.8
 */
export const listGrievances = async (req, res) => {
    try {
        const requestorRole       = req.user?.role ?? "";
        const requestorEmployeeId = req.user?.employeeId ?? null;

        const filter = {};

        // Access control: non-HR employees see only their own grievances
        if (requestorRole !== "HR_Manager") {
            if (!requestorEmployeeId) {
                return res.status(403).send({
                    status: false,
                    error: "Access denied",
                    details: ["You are not authorised to list grievances"]
                });
            }
            filter.complainantEmployeeId = requestorEmployeeId;
        } else {
            // HR_Manager filters
            if (req.query.status)   filter.status   = req.query.status;
            if (req.query.category) filter.category = req.query.category;
        }

        const grievances = await GrievanceModal.find(filter).sort({ submissionDate: -1 });
        attachRole(grievances, requestorRole);

        return res.status(200).send({
            status: true,
            data: grievances.map(g => g.toJSON())
        });
    } catch (err) {
        return hrmsCatch(res, err, "Grievances load failed", "The grievances could not be loaded. Please try again.");
    }
};

/**
 * PUT /HrGrievance/:id/assign
 * Assign an investigating officer and transition to "under-investigation".
 * Requirements 10.3, 10.4
 */
export const assignInvestigatingOfficer = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["investigatingOfficerId"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const requestorRole = req.user?.role ?? "";
        if (requestorRole !== "HR_Manager") {
            return res.status(403).send({
                status: false,
                error: "Access denied",
                details: ["Only HR_Managers can assign an investigating officer"]
            });
        }

        const grievance = await GrievanceModal.findById(req.params.id);
        if (!grievance) {
            return res.status(404).send({
                status: false,
                error: "Grievance not found", details: ["No grievance exists for this id."]
            });
        }

        if (grievance.status === "closed") {
            return res.status(400).send({
                status: false,
                error: "Cannot assign investigating officer to a closed grievance",
                details: []
            });
        }

        grievance.investigatingOfficerId = req.body.investigatingOfficerId;
        grievance.status = "under-investigation";
        await grievance.save();

        grievance._requestorRole = requestorRole;
        return res.status(200).send({ status: true, data: grievance.toJSON() });
    } catch (err) {
        return hrmsCatch(res, err, "Investigating officer update failed", "The investigating officer could not be updated. Please try again.");
    }
};

/**
 * POST /HrGrievance/:id/note
 * Append an investigation note (immutable after insert).
 * Guard: only the assigned investigating officer may append.
 * Requirements 10.4, 10.6
 */
export const appendInvestigationNote = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["text", "authorId"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const grievance = await GrievanceModal.findById(req.params.id);
        if (!grievance) {
            return res.status(404).send({
                status: false,
                error: "Grievance not found", details: ["No grievance exists for this id."]
            });
        }

        // Only the assigned investigating officer may add notes
        const requestorEmployeeId = req.user?.employeeId ?? req.body.authorId;
        const officerId = grievance.investigatingOfficerId
            ? grievance.investigatingOfficerId.toString()
            : null;

        if (!officerId) {
            return res.status(400).send({
                status: false,
                error: "No investigating officer assigned yet",
                details: []
            });
        }

        if (requestorEmployeeId && requestorEmployeeId.toString() !== officerId) {
            const requestorRole = req.user?.role ?? "";
            if (requestorRole !== "HR_Manager") {
                return res.status(403).send({
                    status: false,
                    error: "Access denied",
                    details: ["Only the assigned investigating officer may append notes"]
                });
            }
        }

        // Push note — notes are immutable after insert (no update/delete on individual notes)
        const note = {
            text:      req.body.text,
            authorId:  req.body.authorId,
            timestamp: new Date()
        };

        // Use $push to add the note atomically (no pull/update on existing notes)
        const updated = await GrievanceModal.findByIdAndUpdate(
            req.params.id,
            { $push: { investigationNotes: note } },
            { new: true }
        );

        const requestorRole = req.user?.role ?? "";
        updated._requestorRole = requestorRole;

        return res.status(200).send({ status: true, data: updated.toJSON() });
    } catch (err) {
        return hrmsCatch(res, err, "Append investigation note failed", "The append investigation note could not be completed. Please try again.");
    }
};

/**
 * PUT /HrGrievance/:id/resolve
 * Record resolution and close the grievance.
 * Guard: investigating officer must be assigned before closure.
 * Requirements 10.5, 10.7
 */
export const resolveGrievance = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["resolution"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const requestorRole = req.user?.role ?? "";
        if (requestorRole !== "HR_Manager") {
            return res.status(403).send({
                status: false,
                error: "Access denied",
                details: ["Only HR_Managers can resolve a grievance"]
            });
        }

        const grievance = await GrievanceModal.findById(req.params.id);
        if (!grievance) {
            return res.status(404).send({
                status: false,
                error: "Grievance not found", details: ["No grievance exists for this id."]
            });
        }

        if (grievance.status === "closed") {
            return res.status(400).send({
                status: false,
                error: "Grievance is already closed",
                details: []
            });
        }

        // Requirement 10.5 — investigating officer must be assigned before closure
        if (!grievance.investigatingOfficerId) {
            return res.status(400).send({
                status: false,
                error: "Cannot close grievance without an assigned investigating officer",
                details: []
            });
        }

        const allowedResolutions = ["resolved", "dismissed", "escalated", "referred-to-authority"];
        if (!allowedResolutions.includes(req.body.resolution)) {
            return res.status(400).send({
                status: false,
                error: "Validation failed",
                details: [`resolution must be one of: ${allowedResolutions.join(", ")}`]
            });
        }

        grievance.status            = "closed";
        grievance.resolution        = req.body.resolution;
        grievance.resolutionSummary = req.body.resolutionSummary ?? "";
        grievance.closeDate         = new Date();
        await grievance.save();

        grievance._requestorRole = requestorRole;
        return res.status(200).send({ status: true, data: grievance.toJSON() });
    } catch (err) {
        return hrmsCatch(res, err, "Resolve grievance failed", "The resolve grievance could not be completed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Disciplinary Action Handlers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /HrDisciplinary
 * Create a disciplinary action record.
 * - Validate durationDays for suspension (1–365, required).
 * - Auto-initiate SeparationRequest on type "termination"; log error if it
 *   fails but do NOT block the disciplinary record.
 * Requirements 10.10, 10.11, 10.12, 10.13
 */
export const createDisciplinaryAction = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "employeeId", "actionType", "reason", "date", "issuingManagerId"
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const requestorRole = req.user?.role ?? "";
        if (requestorRole !== "HR_Manager") {
            return res.status(403).send({
                status: false,
                error: "Access denied",
                details: ["Only HR_Managers can create disciplinary actions"]
            });
        }

        const { employeeId, actionType, reason, date, durationDays, grievanceId, issuingManagerId } = req.body;

        // Validate durationDays for suspension — Requirement 10.11
        if (actionType === "suspension") {
            if (
                durationDays === undefined ||
                durationDays === null ||
                !Number.isInteger(Number(durationDays)) ||
                Number(durationDays) < 1 ||
                Number(durationDays) > 365
            ) {
                return res.status(400).send({
                    status: false,
                    error: "Validation failed",
                    details: ["durationDays is required for suspension and must be an integer between 1 and 365"]
                });
            }
        }

        // Verify employee exists
        const employee = await EmployeeHrModal.findById(employeeId);
        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        const disciplinaryData = {
            employeeId,
            actionType,
            reason,
            date: new Date(date),
            issuingManagerId
        };

        if (grievanceId)  disciplinaryData.grievanceId  = grievanceId;
        if (actionType === "suspension" && durationDays !== undefined) {
            disciplinaryData.durationDays = Number(durationDays);
        }

        // Persist disciplinary action
        const action = await DisciplinaryActionModal.create(disciplinaryData);

        // Auto-initiate SeparationRequest on termination — Requirement 10.13
        let separationWarning = null;
        if (actionType === "termination") {
            try {
                const today = new Date();
                await SeparationRequestModal.create({
                    employeeId,
                    separationType:       "termination",
                    noticePeriodStartDate: today,
                    lastWorkingDate:       today,
                    reason:               `Disciplinary termination — Action ID: ${action._id}`,
                    status:               "pending"
                });

                // Update employee status to on_notice per Requirement 7.2
                await EmployeeHrModal.findByIdAndUpdate(employeeId, { status: "on_notice" });
            } catch (sepErr) {
                // Log error but do NOT block the disciplinary record (Requirement 10.13)
                console.error(
                    "[GrievanceControllar] Failed to auto-create SeparationRequest for disciplinary termination:",
                    sepErr.message
                );
                separationWarning = "Disciplinary record created but SeparationRequest auto-initiation failed. Please create the separation record manually.";
            }
        }

        const responsePayload = { status: true, data: action };
        if (separationWarning) {
            responsePayload.warning = separationWarning;
        }

        return res.status(200).send(responsePayload);
    } catch (err) {
        return hrmsCatch(res, err, "Disciplinary action save failed", "The disciplinary action could not be saved. Please try again.");
    }
};

/**
 * GET /HrDisciplinary/employee/:empId
 * Return disciplinary history for a specific employee.
 * Non-HR employees can only access their own records.
 * Requirements 10.12
 */
export const getEmployeeDisciplinaryHistory = async (req, res) => {
    try {
        const { empId } = req.params;
        const requestorRole       = req.user?.role ?? "";
        const requestorEmployeeId = req.user?.employeeId ?? null;

        // Access control — Requirement 10.8
        if (requestorRole !== "HR_Manager") {
            if (!requestorEmployeeId || requestorEmployeeId.toString() !== empId.toString()) {
                return res.status(403).send({
                    status: false,
                    error: "Access denied",
                    details: ["You are not authorised to view this employee's disciplinary records"]
                });
            }
        }

        const records = await DisciplinaryActionModal.find({ employeeId: empId })
            .populate("grievanceId", "referenceNumber subject status")
            .sort({ date: -1 });

        return res.status(200).send({ status: true, data: records });
    } catch (err) {
        return hrmsCatch(res, err, "Employee disciplinary history load failed", "The employee disciplinary history could not be loaded. Please try again.");
    }
};
