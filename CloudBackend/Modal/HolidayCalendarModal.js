import mongoose from "mongoose";

const HolidayCalendarSchema = new mongoose.Schema({
    date: { type: String, required: true }, // "start_end" format
    name: { type: String, required: true },
    province: {
        type: String,
        enum: ["All", "Sindh", "Punjab", "KPK", "Balochistan", "Islamabad"],
        default: "All"
    },
    applicableReligion: {
        type: String,
        enum: ["All", "Muslim", "Hindu", "Christian"],
        default: "All"
    },
    isOptional: { type: Boolean, default: false },
    year: { type: Number, required: true }
}, {
    timestamps: { createdAt: "create_at", updatedAt: "updated_at" }
});

HolidayCalendarSchema.index({ date: 1, province: 1, applicableReligion: 1 });

export default mongoose.model("HolidayCalendar", HolidayCalendarSchema);