import mongoose from "mongoose";

const ApprovalHistorySchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "StaffLoan", required: true, index: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, index: true },
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "HrApprovalWorkflow", required: true },
    
    stepNumber: { type: Number, required: true },
    stepName: { type: String, required: true },
    role: { type: String, required: true },
    
    action: { type: String, enum: ["created", "approved", "rejected", "cancelled"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    
    previousAmount: { type: Number, default: null },
    updatedAmount: { type: Number, default: null },
    
    previousStatus: { type: String, default: null },
    newStatus: { type: String, required: true },
    
    remarks: { type: String, default: "" },
    actionDate: { type: Date, default: Date.now }
}, { timestamps: true });

ApprovalHistorySchema.index({ loanId: 1, stepNumber: 1 });
ApprovalHistorySchema.index({ employeeId: 1, actionDate: -1 });

const ApprovalHistoryModal = mongoose.model("ApprovalHistory", ApprovalHistorySchema);

export default ApprovalHistoryModal;
