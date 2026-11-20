import mongoose from "mongoose";

const AttendanceHrSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrEmployee",
        required: true
    },
    date: {
        type: String,
        required: true
    },
    checkIn: {
        type: String,
        default: ""
    },
    checkOut: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["holiday", "present", "absent", "late", "half-day", "leave"],
        default: "present"
    },
    attendanceStatus: {
        type: String,
        enum: ["present", "absent", "leave", "holiday", "weekly_off", "half_day"],
        default: "present"
    },
    workMode: {
        type: String,
        enum: ["office", "work_from_home", "remote", "official_duty", "business_trip", "training"],
        default: "office"
    },
    overtime: {
        type: Number,
        default: 0
    },
    remarks: {
        type: String,
        default: ""
    },
    informed: {
        type: Boolean,
        default: false
    },
    leaveApplicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrLeaveApplication"
    },
    leaveTypeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrLeaveType"
    },
    isExtraDay: {
        type: Boolean,
        default: false
    }
})

const AttendanceHrModal = mongoose.model("HrAttendance", AttendanceHrSchema)

export default AttendanceHrModal
