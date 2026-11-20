import mongoose from "mongoose";

const PayrollMonthSchema = new mongoose.Schema({
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    closedAt: { type: Date },
    closedBy: { type: String, default: "" },
    reopenedAt: { type: Date },
    reopenedBy: { type: String, default: "" }
}, { timestamps: true });

PayrollMonthSchema.index({ month: 1, year: 1 }, { unique: true });

const PayrollMonthModal = mongoose.model("HrPayrollMonth", PayrollMonthSchema);
export default PayrollMonthModal;
