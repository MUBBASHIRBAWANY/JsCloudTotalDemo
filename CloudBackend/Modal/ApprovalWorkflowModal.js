import mongoose from "mongoose";

const ApprovalLevelSchema = new mongoose.Schema({
    stepNumber: { type: Number, required: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    permissions: {
        canApprove: { type: Boolean, default: true },
        canReject: { type: Boolean, default: true },
        canEditAmount: { type: Boolean, default: false },
        canEditRemarks: { type: Boolean, default: true }
    }
}, { _id: false });

const ApprovalWorkflowSchema = new mongoose.Schema({
    name: { type: String, required: true },
    module: { type: String, enum: ["leave", "attendance_correction", "overtime", "loan_advance"], required: true },
    steps: [ApprovalLevelSchema],
    isActive: { type: Boolean, default: true }
}, { timestamps: true });

const ApprovalWorkflowModal = mongoose.model("HrApprovalWorkflow", ApprovalWorkflowSchema);

export default ApprovalWorkflowModal;
