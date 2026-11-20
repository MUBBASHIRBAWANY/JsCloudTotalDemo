import mongoose from "mongoose";

/**
 * Links an employee to a shift from a given effective date.
 * Requirement 6.2 — per-employee shift assignment overrides the
 * global Company_Policy shift for attendance calculations.
 */
const EmployeeShiftAssignmentSchema = new mongoose.Schema(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            required: true,
        },
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shift",
            required: true,
        },
        effectiveFrom: {
            type: Date,
            required: true,
        },
    },
    { timestamps: true }
);

const EmployeeShiftAssignmentModal = mongoose.model(
    "EmployeeShiftAssignment",
    EmployeeShiftAssignmentSchema
);

export default EmployeeShiftAssignmentModal;
