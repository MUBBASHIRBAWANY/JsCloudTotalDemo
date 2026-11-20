import mongoose from "mongoose";

const StaffLoanRecoverySchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "StaffLoan", required: true },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    journalVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
    recoveredAt: { type: Date, default: Date.now }
}, { timestamps: true });

StaffLoanRecoverySchema.index({ loanId: 1 });

const StaffLoanRecovery = mongoose.model("StaffLoanRecovery", StaffLoanRecoverySchema);
export default StaffLoanRecovery;
