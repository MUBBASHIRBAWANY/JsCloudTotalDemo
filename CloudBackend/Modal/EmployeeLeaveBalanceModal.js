import mongoose from "mongoose";

const EmployeeLeaveBalanceSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    leavePolicyId: { type: mongoose.Schema.Types.ObjectId, ref: "HrLeavePolicy", required: true },
    leaveTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrLeaveType", required: true },
    year: { type: Number, required: true },
    allocated: { type: Number, default: 0 },
    used: { type: Number, default: 0 },
    carriedForward: { type: Number, default: 0 },
    balance: { type: Number, default: 0 }
}, { timestamps: true });

EmployeeLeaveBalanceSchema.index({ employeeId: 1, leaveTypeId: 1, year: 1 }, { unique: true });

const EmployeeLeaveBalanceModal = mongoose.model("HrEmployeeLeaveBalance", EmployeeLeaveBalanceSchema);

export default EmployeeLeaveBalanceModal;
