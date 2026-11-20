import mongoose from "mongoose";

/**
 * Leave Application submitted by an employee.
 * Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.9, 2.12
 */
const LeaveApplicationSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrEmployee",
        required: true
    },
    leaveType: {
        type: String,
        enum: ["casual", "medical", "annual", "unpaid", "maternity", "paternity"],
        required: true
    },
    leaveTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrLeaveType"
    },
    isHalfDay: { type: Boolean, default: false },
    halfDaySlot: { type: String, enum: ["first_half", "second_half"] },
    attachmentUrl: { type: String, default: "" },
    medicalCertUrl: { type: String, default: "" },
    emergencyContact: { type: String, default: "" },
    contactDuringLeave: { type: String, default: "" },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    daysRequested: {
        type: Number,
        required: true,
        min: 0
    },
    reason: {
        type: String,
        maxlength: 500,
        default: ""
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending"
    },
    approverRemark: {
        type: String,
        maxlength: 500,
        default: ""
    },
    approverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeHr",
        default: null
    }
}, { timestamps: true });

const LeaveApplicationModal = mongoose.model("HrLeaveApplication", LeaveApplicationSchema);

export default LeaveApplicationModal;
