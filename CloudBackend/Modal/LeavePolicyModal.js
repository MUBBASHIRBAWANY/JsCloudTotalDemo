import mongoose from "mongoose";

const LeavePolicySchema = new mongoose.Schema({
    name: { type: String, required: true },
    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrLeaveType", required: true },
    annualAllocation: { type: Number, default: 0 },
    monthlyAllocation: { type: Number, default: 0 },
    carryForward: { type: Boolean, default: false },
    maxCarryForward: { type: Number, default: 0 },
    encashmentAllowed: { type: Boolean, default: false },
    maxConsecutiveDays: { type: Number, default: 0 },
    minAdvanceNoticeDays: { type: Number, default: 0 },
    requireMedicalCert: { type: Boolean, default: false },
    requireApproval: { type: Boolean, default: true },
    departments: [{ type: mongoose.Schema.Types.ObjectId, ref: "HrDepartment" }],
    designations: [{ type: mongoose.Schema.Types.ObjectId, ref: "HrDesignation" }],
    stores: [{ type: String }],
    employmentTypes: [{ type: String, enum: ["permanent", "contract", "guest", "intern"] }],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const LeavePolicyModal = mongoose.model("HrLeavePolicy", LeavePolicySchema);

export default LeavePolicyModal;
