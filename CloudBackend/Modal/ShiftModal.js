import mongoose from "mongoose";

/**
 * Defines a named work shift with start/end times, applicable days,
 * and a grace period for late arrivals.
 * Requirement 6.1 — multiple shifts supported simultaneously.
 */
const ShiftSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        startTime: {
            type: String,
            required: true,
            match: [/^\d{2}:\d{2}$/, "startTime must be in HH:MM format"],
        },
        endTime: {
            type: String,
            required: true,
            match: [/^\d{2}:\d{2}$/, "endTime must be in HH:MM format"],
        },
        applicableDays: {
            type: [String],
            required: true,
            enum: {
                values: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
                message: "{VALUE} is not a valid weekday name",
            },
        },
        gracePeriodMinutes: {
            type: Number,
            required: true,
            min: [0, "gracePeriodMinutes cannot be less than 0"],
            max: [60, "gracePeriodMinutes cannot exceed 60"],
            default: 0,
        },
        breakMinutes: { type: Number, default: 0 },
        workingHours: { type: Number, default: 8 },
        isNightShift: { type: Boolean, default: false },
        isFlexible: { type: Boolean, default: false },
        flexibleMinHours: { type: Number, default: 0 }
    },
    { timestamps: true }
);

const ShiftModal = mongoose.model("Shift", ShiftSchema);

export default ShiftModal;
