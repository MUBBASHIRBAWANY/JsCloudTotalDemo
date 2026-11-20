import mongoose from "mongoose";

const AttendanceMonthLockSchema = new mongoose.Schema({
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    locked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    lockedAt: { type: Date },
    unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    unlockedAt: { type: Date },
    reason: { type: String, default: "" }
}, { timestamps: true });

AttendanceMonthLockSchema.index({ month: 1, year: 1 }, { unique: true });

const AttendanceMonthLockModal = mongoose.model("HrAttendanceMonthLock", AttendanceMonthLockSchema);

export default AttendanceMonthLockModal;
