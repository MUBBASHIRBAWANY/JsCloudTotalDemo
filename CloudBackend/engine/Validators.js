/**
 * Shared validator utility for Advanced HRMS modules.
 * Used across all modules to enforce required-field presence before persistence.
 */

import { hrmsBody } from "../utils/hrmsError.js";

const FIELD_LABELS = {
    employeeId: "Employee",
    leaveTypeId: "Leave type",
    leavePolicyId: "Leave policy",
    jobPostingId: "Job posting",
    interviewerId: "Interviewer",
    toDepartmentId: "Destination department",
    approverRemark: "Approver remark",
    requestedAmount: "Requested amount",
    probationMonths: "Probation months",
    joiningDate: "Joining date",
    positionTitle: "Position title",
    interviewDate: "Interview date",
    interviewTime: "Interview time",
    interviewMode: "Interview mode",
    cycleId: "Appraisal cycle",
    startDate: "Start date",
    endDate: "End date",
    leaveType: "Leave type",
};

function fieldLabel(field) {
    if (FIELD_LABELS[field]) return FIELD_LABELS[field];
    const words = String(field).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/_/g, " ");
    return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Validates that all specified fields are present and non-empty on the request body.
 *
 * @param {Object} body   - The request body object (req.body)
 * @param {string[]} fields - Array of field names that are required
 * @returns {null | { status: false, error: string, message: string, details: string[] }}
 *   Returns null when all fields are present. Otherwise the title is in `error`
 *   and each missing field is a sentence in `details`.
 */
export function validateRequired(body, fields) {
    const missing = fields.filter(field => {
        if (!Object.hasOwn(body, field)) return true;
        const value = body[field];
        return value === null || value === "";
    });

    if (missing.length === 0) {
        return null;
    }

    return hrmsBody("Validation failed", missing.map(field => `${fieldLabel(field)} is required.`));
}
