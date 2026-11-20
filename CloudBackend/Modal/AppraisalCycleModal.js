import mongoose from "mongoose";

/**
 * Appraisal Cycle — defines a review period (annual, semi-annual, quarterly).
 * Requirements 4.1, 4.2, 4.4
 */
const AppraisalCycleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        cycleType: {
            type: String,
            enum: ["annual", "semi-annual", "quarterly"],
            required: true,
        },
        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },
        status: {
            type: String,
            enum: ["draft", "active", "closed"],
            default: "draft",
        },
    },
    { timestamps: true }
);

const AppraisalCycleModal = mongoose.model("AppraisalCycle", AppraisalCycleSchema);

export default AppraisalCycleModal;
