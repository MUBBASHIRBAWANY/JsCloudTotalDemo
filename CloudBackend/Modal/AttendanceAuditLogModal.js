import mongoose from "mongoose";

const AttendanceAuditLogSchema = new mongoose.Schema({
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "HrAttendance" },
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee" },
    action: { type: String, enum: ["created", "updated", "deleted", "corrected"], required: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed },
    reason: { type: String, default: "" },
    ipAddress: { type: String, default: "" }
}, { timestamps: true });

AttendanceAuditLogSchema.index({ employeeId: 1, createdAt: -1 });
AttendanceAuditLogSchema.index({ attendanceId: 1 });

const AttendanceAuditLogModal = mongoose.model("HrAttendanceAuditLog", AttendanceAuditLogSchema);

export default AttendanceAuditLogModal;
