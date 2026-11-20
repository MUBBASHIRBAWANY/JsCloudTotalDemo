import mongoose from "mongoose";

const EmployeeShiftHistorySchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: "Shift", required: true },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reason: { type: String, default: "" }
}, { timestamps: true });

EmployeeShiftHistorySchema.index({ employeeId: 1, effectiveFrom: -1 });
EmployeeShiftHistorySchema.index({ employeeId: 1, isActive: 1 });

const EmployeeShiftHistoryModal = mongoose.model("HrEmployeeShiftHistory", EmployeeShiftHistorySchema);

export default EmployeeShiftHistoryModal;
