import mongoose from "mongoose";

const EarningDeductionCodeSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["earning", "deduction"], required: true },
    defaultAmount: { type: Number, default: 0 },
    linkAccount: { type: String, default: "" },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const EarningDeductionCodeModal = mongoose.model("HrEarningDeductionCode", EarningDeductionCodeSchema);
export default EarningDeductionCodeModal;
