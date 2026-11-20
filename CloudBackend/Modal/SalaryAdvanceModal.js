import mongoose from "mongoose";

const SalaryAdvanceSchema = new mongoose.Schema({
    advanceNumber: { type: String, required: true, unique: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    requestDate: { type: Date, default: Date.now },
    amount: { type: Number, required: true },
    
    // Workflow state
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "HrApprovalWorkflow", default: null },
    currentStep: { type: Number, default: 1 },
    status: {
        type: String,
        enum: ["draft", "pending_finance", "approved", "paid", "recovered", "cancelled"],
        default: "draft"
    },
    
    // References
    businessId: { type: mongoose.Schema.Types.ObjectId, default: null },
    storeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    
    // Payment
    paymentMethod: { type: String, enum: ["cash", "bank"], default: "bank" },
    voucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
    voucherNumber: { type: String, default: "" },
    
    // Approver tracking
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    financeApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    financeApprovedAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    paidAt: { type: Date, default: null },
    recoveredAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    rejectionReason: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    cancelReason: { type: String, default: "" },
    remarks: { type: String, default: "" }
}, { timestamps: true });

SalaryAdvanceSchema.index({ employeeId: 1, status: 1 });

const SalaryAdvance = mongoose.model("SalaryAdvance", SalaryAdvanceSchema);
export default SalaryAdvance;
