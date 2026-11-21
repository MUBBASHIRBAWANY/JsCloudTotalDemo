import mongoose from "mongoose";
import SeparationRequestModal from "../Modal/SeparationRequestModal.js";
import ClearanceChecklistModal from "../Modal/ClearanceChecklistModal.js";
import EmployeeHrModal from "../Modal/EmployeeHrModal.js";
import LoanModal from "../Modal/LoanModal.js";
import PayrollAdjustmentModal from "../Modal/PayrollAdjustmentModal.js";
import CompanyPolicyModal from "../Modal/CompanyPolicyModal.js";
import HrRetryLogModal from "../Modal/HrRetryLogModal.js";
import { computeSettlement } from "../engine/SettlementEngine.js";
import { validateRequired } from "../engine/Validators.js";
import { hrmsCatch } from "../utils/hrmsError.js";


// ─────────────────────────────────────────────────────────────────────────────
// Default clearance tasks — Requirement 7.3
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CLEARANCE_TASKS = [
    "IT equipment return",
    "Access revocation",
    "Finance clearance",
    "Asset handover",
    "Manager sign-off"
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Attempt to create a PayrollAdjustment and mark employee as "terminated"
 * within a Mongoose session.  Returns { ok: true } on success or
 * { ok: false, error } on failure.
 */
async function performSettlementActions(employeeId, separationRequest, netSettlement, session) {
    const now = new Date();
    await PayrollAdjustmentModal.create(
        [{
            employeeId,
            month:       now.getMonth() + 1,
            year:        now.getFullYear(),
            type:        "other",
            amount:      netSettlement,
            description: `Final settlement — Separation ID: ${separationRequest._id}`,
            createdAt:   now.toISOString()
        }],
        { session }
    );

    await EmployeeHrModal.findByIdAndUpdate(
        employeeId,
        { status: "terminated" },
        { session }
    );
}

/**
 * Schedule up to 3 async retries for failed settlement actions.
 * Logs each attempt to HrRetryLog (Requirement 7.7).
 */
async function scheduleRetries(separationRequest, employeeId, netSettlement) {
    // Find or create a retry log for this separation request
    let retryLog = await HrRetryLogModal.findOne({
        referenceType: "SeparationRequest",
        referenceId:   separationRequest._id,
        failedAction:  "finalSettlement"
    });

    if (!retryLog) {
        retryLog = await HrRetryLogModal.create({
            referenceType: "SeparationRequest",
            referenceId:   separationRequest._id,
            failedAction:  "finalSettlement",
            attemptCount:  0,
            lastAttemptAt: new Date(),
            error:         ""
        });
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 5000; // 5 s between retries (within 24-hour window)

    const attempt = async () => {
        if (retryLog.attemptCount >= MAX_RETRIES) {
            console.error(
                `[SeparationControllar] Max retries (${MAX_RETRIES}) reached for SeparationRequest ${separationRequest._id}. Marking as settled with error.`
            );
            await SeparationRequestModal.findByIdAndUpdate(separationRequest._id, {
                settledWithError: true
            });
            return;
        }

        retryLog.attemptCount  += 1;
        retryLog.lastAttemptAt  = new Date();

        try {
            const session = await mongoose.startSession();
            session.startTransaction();
            try {
                await performSettlementActions(employeeId, separationRequest, netSettlement, session);
                await session.commitTransaction();
                session.endSession();

                // Success — clear any error flag
                await SeparationRequestModal.findByIdAndUpdate(separationRequest._id, {
                    settledWithError: false
                });
                retryLog.error = "";
                await retryLog.save();
                console.log(
                    `[SeparationControllar] Retry ${retryLog.attemptCount} succeeded for SeparationRequest ${separationRequest._id}`
                );
            } catch (innerErr) {
                await session.abortTransaction();
                session.endSession();
                throw innerErr;
            }
        } catch (err) {
            retryLog.error = err.message;
            await retryLog.save();
            console.error(
                `[SeparationControllar] Retry ${retryLog.attemptCount} failed for SeparationRequest ${separationRequest._id}: ${err.message}`
            );

            if (retryLog.attemptCount < MAX_RETRIES) {
                setTimeout(attempt, RETRY_DELAY_MS);
            } else {
                await SeparationRequestModal.findByIdAndUpdate(separationRequest._id, {
                    settledWithError: true
                });
            }
        }
    };

    // Start first retry after a short delay
    setTimeout(attempt, RETRY_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /HrSeparation — Initiate Separation Request
// Requirements 7.1, 7.2, 7.3, 7.9
// ─────────────────────────────────────────────────────────────────────────────
export const initiateSeparation = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, [
            "employeeId",
            "separationType",
            "noticePeriodStartDate",
            "lastWorkingDate"
        ]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const {
            employeeId,
            separationType,
            noticePeriodStartDate,
            lastWorkingDate,
            reason = ""
        } = req.body;

        const startDate = new Date(noticePeriodStartDate);
        const endDate   = new Date(lastWorkingDate);

        // Requirement 7.1 — lastWorkingDate must be >= noticePeriodStartDate
        if (endDate < startDate) {
            return res.status(400).send({
                status:  false,
                error:   "Validation failed",
                details: ["lastWorkingDate must be greater than or equal to noticePeriodStartDate"]
            });
        }

        // Verify employee exists
        const employee = await EmployeeHrModal.findById(employeeId);
        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        // Requirement 7.9 — Short-notice flag logic using CompanyPolicy
        let shortNoticeFlag = false;
        try {
            const policy = await CompanyPolicyModal.findOne({});
            // CompanyPolicyModal does not have a noticePeriodDays field in the base schema.
            // We use workingDaysPerWeek as a proxy only if the policy document provides a
            // dedicated notice_period_days field; otherwise we treat it as 0 (no warning).
            const noticePeriodDays = policy?.noticePeriodDays ?? 0;
            if (noticePeriodDays > 0) {
                const requiredLastDate = new Date(startDate);
                requiredLastDate.setDate(requiredLastDate.getDate() + noticePeriodDays - 1);
                if (endDate < requiredLastDate) {
                    shortNoticeFlag = true;
                }
            }
        } catch (_policyErr) {
            // Non-blocking — proceed without short-notice flag if policy read fails
        }

        // Create separation request
        const separation = await SeparationRequestModal.create({
            employeeId,
            separationType,
            noticePeriodStartDate: startDate,
            lastWorkingDate:       endDate,
            reason,
            status:          "pending",
            shortNoticeFlag,
            settlementConfirmed: false,
            settlementData:  null
        });

        // Requirement 7.2 — set employee status to "on_notice"
        await EmployeeHrModal.findByIdAndUpdate(employeeId, { status: "on_notice" });

        // Requirement 7.3 — auto-generate clearance checklist with 5 default tasks
        const tasks = DEFAULT_CLEARANCE_TASKS.map(name => ({
            taskName:    name,
            isComplete:  false,
            completedBy: null,
            completedAt: null
        }));

        const checklist = await ClearanceChecklistModal.create({
            separationRequestId: separation._id,
            tasks
        });

        return res.status(200).send({
            status: true,
            data: {
                separation,
                checklist,
                shortNoticeWarning: shortNoticeFlag
                    ? "Short notice detected — HR review required"
                    : null
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Initiate separation failed", "The initiate separation could not be completed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /HrSeparation/:id — Get Separation Details
// ─────────────────────────────────────────────────────────────────────────────
export const getSeparationById = async (req, res) => {
    try {
        const separation = await SeparationRequestModal.findById(req.params.id)
            .populate("employeeId", "firstName lastName code designationId departmentId joiningDate status");

        if (!separation) {
            return res.status(404).send({
                status: false,
                error: "Separation request not found", details: ["No separation request exists for this id."]
            });
        }

        const checklist = await ClearanceChecklistModal.findOne({
            separationRequestId: separation._id
        });

        return res.status(200).send({
            status: true,
            data:   { separation, checklist }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Separation load failed", "The separation could not be loaded. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /HrSeparation/:id/clearance/task — Update Clearance Task
// Requirements 7.4
// ─────────────────────────────────────────────────────────────────────────────
export const updateClearanceTask = async (req, res) => {
    try {
        const validationError = validateRequired(req.body, ["taskId"]);
        if (validationError) {
            return res.status(400).send(validationError);
        }

        const { taskId, isComplete, assignedTo, completedBy } = req.body;

        const checklist = await ClearanceChecklistModal.findOne({
            separationRequestId: req.params.id
        });

        if (!checklist) {
            return res.status(404).send({
                status: false,
                error:  "Clearance checklist not found for this separation request",
                details: []
            });
        }

        const task = checklist.tasks.id(taskId);
        if (!task) {
            return res.status(404).send({
                status: false,
                error:  "Task not found in clearance checklist",
                details: []
            });
        }

        if (assignedTo !== undefined) task.assignedTo = assignedTo;

        if (isComplete === true && !task.isComplete) {
            task.isComplete  = true;
            task.completedBy = completedBy ?? null;
            task.completedAt = new Date();
        } else if (isComplete === false) {
            task.isComplete  = false;
            task.completedBy = null;
            task.completedAt = null;
        }

        await checklist.save();

        // Requirement 7.5 — check if all tasks are complete to unlock settlement
        const allComplete = checklist.tasks.every(t => t.isComplete);
        if (allComplete && checklist.tasks.length > 0) {
            await SeparationRequestModal.findByIdAndUpdate(req.params.id, {
                status: "cleared"
            });
        }

        return res.status(200).send({ status: true, data: checklist });
    } catch (err) {
        return hrmsCatch(res, err, "Clearance task update failed", "The clearance task could not be updated. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /HrSeparation/:id/settlement — Preview Settlement
// Requirements 7.5, 7.6
// ─────────────────────────────────────────────────────────────────────────────
export const previewSettlement = async (req, res) => {
    try {
        const separation = await SeparationRequestModal.findById(req.params.id);
        if (!separation) {
            return res.status(404).send({
                status: false,
                error: "Separation request not found", details: ["No separation request exists for this id."]
            });
        }

        // Requirement 7.5 — settlement locked until all clearance tasks complete
        if (separation.status !== "cleared" && separation.status !== "settled") {
            return res.status(400).send({
                status: false,
                error:  "Settlement preview is not available until all clearance tasks are marked complete",
                details: []
            });
        }

        const employee = await EmployeeHrModal.findById(separation.employeeId);
        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        // Fetch active loan balances
        const activeLoans = await LoanModal.find({
            employeeId: separation.employeeId,
            status:     "active"
        });
        const loanBalances = activeLoans.map(l => l.remainingBalance);

        const settlement = computeSettlement(employee, separation, loanBalances);

        return res.status(200).send({
            status: true,
            data: {
                ...settlement,
                employeeId:  separation.employeeId,
                separationId: separation._id
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Preview settlement failed", "The preview settlement could not be completed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /HrSeparation/:id/settlement/confirm — Confirm Settlement
// Requirements 7.7, 7.8
// ─────────────────────────────────────────────────────────────────────────────
export const confirmSettlement = async (req, res) => {
    try {
        const separation = await SeparationRequestModal.findById(req.params.id);
        if (!separation) {
            return res.status(404).send({
                status: false,
                error: "Separation request not found", details: ["No separation request exists for this id."]
            });
        }

        if (separation.status !== "cleared") {
            return res.status(400).send({
                status: false,
                error:  "Settlement can only be confirmed after all clearance tasks are complete",
                details: []
            });
        }

        if (separation.settlementConfirmed) {
            return res.status(400).send({
                status: false,
                error:  "Settlement has already been confirmed for this separation request",
                details: []
            });
        }

        const employee = await EmployeeHrModal.findById(separation.employeeId)
            .populate("designationId", "title")
            .populate("departmentId", "name");

        if (!employee) {
            return res.status(404).send({
                status: false,
                error: "Employee not found", details: ["No employee exists for this id."]
            });
        }

        // Compute final settlement figures
        const activeLoans = await LoanModal.find({
            employeeId: separation.employeeId,
            status:     "active"
        });
        const loanBalances = activeLoans.map(l => l.remainingBalance);
        const settlementData = computeSettlement(employee, separation, loanBalances);

        // Mark settlement as confirmed and snapshot the data
        await SeparationRequestModal.findByIdAndUpdate(separation._id, {
            settlementConfirmed: true,
            settlementData,
            status: "settled"
        });

        // Requirement 7.7 — Mongoose session: create PayrollAdjustment + set employee terminated
        let settlementActionsOk = false;
        let settlementError     = null;
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            await performSettlementActions(
                separation.employeeId,
                separation,
                settlementData.netSettlement,
                session
            );
            await session.commitTransaction();
            settlementActionsOk = true;
        } catch (txErr) {
            await session.abortTransaction();
            settlementError = txErr.message;
            console.error(
                `[SeparationControllar] Settlement transaction failed for ${separation._id}: ${txErr.message}`
            );
        } finally {
            session.endSession();
        }

        // If transaction failed, schedule async retries (up to 3) — Requirement 7.7
        if (!settlementActionsOk) {
            await scheduleRetries(separation, separation.employeeId, settlementData.netSettlement);
        }

        // Requirement 7.8 — Generate experience letter on confirmation
        const experienceLetter = generateExperienceLetter(employee, separation);

        return res.status(200).send({
            status: true,
            data: {
                settlementData,
                experienceLetter,
                retryScheduled: !settlementActionsOk,
                warning: settlementActionsOk
                    ? null
                    : "Settlement recorded but payroll adjustment could not be created immediately. Automatic retries have been scheduled."
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Confirm settlement failed", "The confirm settlement could not be completed. Please try again.");
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Experience Letter Generator — Requirement 7.8
// ─────────────────────────────────────────────────────────────────────────────
function generateExperienceLetter(employee, separation) {
    const fullName      = `${employee.firstName} ${employee.lastName}`.trim();
    const employeeCode  = employee.code;
    const designation   = employee.designationId?.title ?? (employee.designationId?.toString() ?? "");
    const department    = employee.departmentId?.name  ?? (employee.departmentId?.toString()  ?? "");
    const joiningDate   = employee.joiningDate
        ? new Date(employee.joiningDate).toLocaleDateString("en-GB")
        : "";
    const lastWorkDate  = new Date(separation.lastWorkingDate).toLocaleDateString("en-GB");

    return {
        fullName,
        employeeCode,
        designation,
        department,
        joiningDate,
        lastWorkingDate: lastWorkDate,
        body: `This is to certify that ${fullName} (Employee Code: ${employeeCode}) has been associated with our organisation as ${designation} in the ${department} department from ${joiningDate} to ${lastWorkDate}. During this tenure, they have demonstrated commitment, professionalism, and a high standard of work. We wish them success in their future endeavours.`
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /HrSeparation/history — Separation History
// Requirement 7.10
// ─────────────────────────────────────────────────────────────────────────────
export const getSeparationHistory = async (req, res) => {
    try {
        const filter = {};

        // Optional query filters
        if (req.query.employeeId)    filter.employeeId    = req.query.employeeId;
        if (req.query.separationType) filter.separationType = req.query.separationType;
        if (req.query.status)        filter.status        = req.query.status;

        const separations = await SeparationRequestModal.find(filter)
            .populate("employeeId", "firstName lastName code designationId departmentId joiningDate status")
            .sort({ createdAt: -1 });

        return res.status(200).send({
            status: true,
            data:   separations,
            meta: {
                retentionNote: "Separation records are retained for a minimum of 7 years for audit compliance (Requirement 7.10).",
                total:         separations.length
            }
        });
    } catch (err) {
        return hrmsCatch(res, err, "Separation history load failed", "The separation history could not be loaded. Please try again.");
    }
};
