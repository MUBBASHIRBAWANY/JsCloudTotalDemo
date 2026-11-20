import mongoose from "mongoose";

const SalaryAdvanceRecoverySchema = new mongoose.Schema({
    advanceId: { type: mongoose.Schema.Types.ObjectId, ref: "SalaryAdvance", required: true },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amount: { type: Number, required: true },
    journalVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
    recoveredAt: { type: Date, default: Date.now }
}, { timestamps: true });

SalaryAdvanceRecoverySchema.index({ advanceId: 1 });

const SalaryAdvanceRecovery = mongoose.model("SalaryAdvanceRecovery", SalaryAdvanceRecoverySchema);
export default SalaryAdvanceRecovery;
