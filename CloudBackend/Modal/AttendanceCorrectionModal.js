import mongoose from "mongoose";

const AttendanceCorrectionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: "HrAttendance" },
    date: { type: String, required: true },
    requestedChanges: {
        checkIn: String,
        checkOut: String,
        attendanceStatus: String,
        workMode: String,
        remarks: String
    },
    reason: { type: String, required: true },
    attachmentUrl: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee" },
    approverRemark: { type: String, default: "" },
    approvedAt: { type: Date }
}, { timestamps: true });

AttendanceCorrectionSchema.index({ employeeId: 1, date: 1 });
AttendanceCorrectionSchema.index({ status: 1 });

const AttendanceCorrectionModal = mongoose.model("HrAttendanceCorrection", AttendanceCorrectionSchema);

export default AttendanceCorrectionModal;
