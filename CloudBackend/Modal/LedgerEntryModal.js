import mongoose from "mongoose";

const LedgerEntrySchema = new mongoose.Schema({
    ledgerType: { type: String, enum: ["ebf", "loan"], required: true },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, index: true },
    
    // Balance tracking
    openingBalance: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    
    // References
    voucherNumber: { type: String, default: "" },
    transactionType: { type: String, required: true },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll", default: null },
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "StaffLoan", default: null },
    
    // Organization references
    businessId: { type: mongoose.Schema.Types.ObjectId, default: null },
    storeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    
    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    transactionDate: { type: Date, default: Date.now },
    remarks: { type: String, default: "" },
    
    // Reversal support
    isReversal: { type: Boolean, default: false },
    reversalOf: { type: mongoose.Schema.Types.ObjectId, ref: "LedgerEntry", default: null }
}, { timestamps: true });

LedgerEntrySchema.index({ employeeId: 1, ledgerType: 1, transactionDate: -1 });
LedgerEntrySchema.index({ voucherNumber: 1 });

const LedgerEntryModal = mongoose.model("LedgerEntry", LedgerEntrySchema);

export default LedgerEntryModal;
