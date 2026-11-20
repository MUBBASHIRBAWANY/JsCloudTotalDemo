import mongoose from "mongoose";

/**
 * KPI — a measurable goal assigned to an employee for an Appraisal_Cycle.
 * Requirements 4.2, 4.3, 4.4, 4.5
 *
 * Weight represents a percentage contribution (total per employee per cycle must
 * not exceed 100 — enforced at the controller level).
 * achievementScore (0–100) is recorded after the cycle end date.
 */
const KPISchema = new mongoose.Schema(
    {
        cycleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AppraisalCycle",
            required: true,
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            required: true,
        },
        title: { type: String, required: true, trim: true },
        weight: {
            type: Number,
            min: 0,
            max: 100,
            comment: "Percentage weight; total across all KPIs for an employee in a cycle must equal 100",
        },
        targetDescription: { type: String, trim: true },
        measurementUnit: { type: String, trim: true },
        achievementScore: {
            type: Number,
            min: 0,
            max: 100,
            default: null,
            comment: "Recorded after cycle end date",
        },
    },
    { timestamps: true }
);

const KPIModal = mongoose.model("KPI", KPISchema);

export default KPIModal;
