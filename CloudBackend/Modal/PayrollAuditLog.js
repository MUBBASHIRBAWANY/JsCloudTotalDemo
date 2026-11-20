import mongoose from "mongoose";

const PayrollAuditLogSchema = new mongoose.Schema({
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll" },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee" },
    action: {
        type: String,
        enum: ["generated", "processed", "approved", "paid", "closed", "reverted", "jv_created", "gl_posted"],
        required: true
    },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    details: { type: String, default: "" },
    ipAddress: { type: String, default: "" }
}, { timestamps: true });

PayrollAuditLogSchema.index({ payrollId: 1 });
PayrollAuditLogSchema.index({ month: 1, year: 1 });
PayrollAuditLogSchema.index({ action: 1 });

const PayrollAuditLog = mongoose.model("HrPayrollAuditLog", PayrollAuditLogSchema);

export default PayrollAuditLog;
