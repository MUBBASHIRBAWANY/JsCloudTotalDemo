import mongoose from "mongoose";

const LoanRepaymentLogSchema = new mongoose.Schema({
    loanId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanAccount", required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, required: true },
    paymentMethod: { type: String, enum: ["salary_deduction", "cash", "bank_transfer"], default: "salary_deduction" },
    recordedBy: { type: String, default: "" },
    remarks: { type: String, default: "" }
}, { timestamps: true });

const LoanRepaymentLogModal = mongoose.model("LoanRepaymentLog", LoanRepaymentLogSchema);

export default LoanRepaymentLogModal;
