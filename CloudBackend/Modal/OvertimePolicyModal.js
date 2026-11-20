import mongoose from "mongoose";

/**
 * Overtime rules per shift: threshold before overtime kicks in,
 * daily cap, and multipliers for weekends and holidays.
 * Requirement 6.4 — per-shift overtime policy configuration.
 */
const OvertimePolicySchema = new mongoose.Schema(
    {
        shiftId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Shift",
            required: true,
        },
        minimumThresholdMinutes: {
            type: Number,
            min: [0, "minimumThresholdMinutes cannot be negative"],
            default: 0,
        },
        maxDailyOvertimeHours: {
            type: Number,
            min: [0, "maxDailyOvertimeHours cannot be negative"],
            default: 0,
        },
        weekendMultiplier: {
            type: Number,
            min: [0, "weekendMultiplier cannot be negative"],
            default: 1,
        },
        holidayMultiplier: {
            type: Number,
            min: [0, "holidayMultiplier cannot be negative"],
            default: 1,
        },
    },
    { timestamps: true }
);

const OvertimePolicyModal = mongoose.model("OvertimePolicy", OvertimePolicySchema);

export default OvertimePolicyModal;
