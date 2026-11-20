import mongoose from "mongoose";

/**
 * Audit trail for manual Leave_Bucket balance adjustments by HR Managers.
 * Requirements 2.11
 */
const LeaveAuditSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeHr",
        required: true
    },
    leaveType: {
        type: String,
        required: true
    },
    previousBalance: {
        type: Number,
        required: true
    },
    newBalance: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        maxlength: 200
    },
    actingHRId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeHr",
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const LeaveAuditModal = mongoose.model("HrLeaveAudit", LeaveAuditSchema);

export default LeaveAuditModal;
