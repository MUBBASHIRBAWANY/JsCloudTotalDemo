import mongoose from "mongoose";

const AmortizationEntrySchema = new mongoose.Schema({
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    amountToDeduct: { type: Number, required: true },
    status: { type: String, enum: ["pending", "processed", "skipped"], default: "pending" },
    processedDate: { type: Date },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll" }
}, { _id: false });

const LoanAccountSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    loanType: { type: String, enum: ["advance", "personal", "emergency", "education"], default: "advance" },
    totalAmount: { type: Number, required: true },
    monthlyDeduction: { type: Number, default: 0 },
    remainingBalance: { type: Number },
    startDate: { type: Date, required: true },
    status: { type: String, enum: ["active", "settled", "cancelled", "defaulted"], default: "active" },
    description: { type: String, default: "" },
    amortizationSchedule: [AmortizationEntrySchema]
}, { timestamps: true });

const LoanModal = mongoose.model("LoanAccount", LoanAccountSchema);

export default LoanModal;
