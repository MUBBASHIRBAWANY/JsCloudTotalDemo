import mongoose from "mongoose";

const MonthlyTransactionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    type: { type: String, enum: ["earning", "deduction"], required: true },
    code: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    note: { type: String, default: "" }
}, { timestamps: true });

MonthlyTransactionSchema.index({ employeeId: 1, month: 1, year: 1 });

const MonthlyTransactionModal = mongoose.model("HrMonthlyTransaction", MonthlyTransactionSchema);
export default MonthlyTransactionModal;
