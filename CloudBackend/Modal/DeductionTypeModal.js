import mongoose from "mongoose";

const DeductionTypeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    defaultAmount: { type: Number, default: 0 },
    type: { type: String, enum: ["fixed", "variable"], default: "fixed" },
    description: { type: String, default: "" },
    mandatory: { type: Boolean, default: false },
    taxApplicable: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const DeductionTypeModal = mongoose.model("HrDeductionType", DeductionTypeSchema);
export default DeductionTypeModal;
