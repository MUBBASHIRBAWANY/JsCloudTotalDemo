import mongoose from "mongoose";

const EBFBalanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, unique: true },
    balance: { type: Number, default: 0 },
    totalContributions: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    lastPayrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll", default: null },
    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

const EBFBalanceModal = mongoose.model("EBFBalance", EBFBalanceSchema);

export default EBFBalanceModal;
