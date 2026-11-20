import mongoose from "mongoose";

const LeaveTypeSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true, unique: true },
    isPaid: { type: Boolean, default: true },
    color: { type: String, default: "#3B82F6" },
    description: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    applicableTo: { type: String, enum: ["all", "male", "female"], default: "all" }
}, { timestamps: true });

const LeaveTypeModal = mongoose.model("HrLeaveType", LeaveTypeSchema);

export default LeaveTypeModal;
