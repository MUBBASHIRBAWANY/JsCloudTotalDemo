import mongoose from "mongoose";

const StaffLoanSchema = new mongoose.Schema({
    loanNumber: { type: String, required: true, unique: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    loanDate: { type: Date, default: Date.now },

    // Amount tracking per stage
    requestedAmount: { type: Number, required: true },
    hrApprovedAmount: { type: Number, default: null },
    financeApprovedAmount: { type: Number, default: null },
    bossApprovedAmount: { type: Number, default: null },
    paidAmount: { type: Number, default: null },

    // Installment tracking (for Employee Loan)
    monthlyInstallment: { type: Number, default: 0 },
    installmentCount: { type: Number, default: 0 },
    totalRecoveryAmount: { type: Number, default: 0 },
    outstandingBalance: { type: Number, default: 0 },

    // Workflow state
    workflowId: { type: mongoose.Schema.Types.ObjectId, ref: "HrApprovalWorkflow", required: true },
    currentStep: { type: Number, default: 1 },
    status: {
        type: String,
        enum: ["draft", "pending_finance", "pending_management", "pending_disbursement", "active", "settled", "rejected", "cancelled"],
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

    // Request info
    reason: { type: String, default: "" },
    supportingInfo: { type: String, default: "" },
    remarks: { type: String, default: "" },

    // Approver tracking
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    approvedAt: { type: Date, default: null },
    financeApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    financeApprovedAt: { type: Date, default: null },
    bossApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    bossApprovedAt: { type: Date, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },

    // Audit
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    paidAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    rejectionReason: { type: String, default: "" }
}, { timestamps: true });

StaffLoanSchema.index({ employeeId: 1, status: 1 });
StaffLoanSchema.index({ status: 1, currentStep: 1 });

const StaffLoan = mongoose.model("StaffLoan", StaffLoanSchema);
export default StaffLoan;
