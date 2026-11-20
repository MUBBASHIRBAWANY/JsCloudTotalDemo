import mongoose from "mongoose";

const ReasonSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    description: { type: String, required: true },
    type: { type: String, enum: ["joining", "leaving"], required: true }
}, { timestamps: true });

const ReasonModal = mongoose.model("HrReason", ReasonSchema);
export default ReasonModal;
