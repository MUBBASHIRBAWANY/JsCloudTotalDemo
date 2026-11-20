import mongoose from "mongoose";

const AllowanceTypeSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, unique: true },
    defaultAmount: { type: Number, default: 0 },
    type: { type: String, enum: ["per_month", "per_day"], default: "per_month" },
    description: { type: String, default: "" },
    taxApplicable: { type: Boolean, default: false },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const AllowanceTypeModal = mongoose.model("HrAllowanceType", AllowanceTypeSchema);
export default AllowanceTypeModal;
