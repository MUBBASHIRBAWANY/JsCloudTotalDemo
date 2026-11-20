import mongoose from "mongoose";

/**
 * Retry log for failed async actions (e.g. settlement confirmation).
 * Requirement 7.7 — up to 3 async retries within 24 hours are tracked here.
 */
const HrRetryLogSchema = new mongoose.Schema({
    referenceType: { type: String, required: true },   // e.g. "SeparationRequest"
    referenceId:   { type: mongoose.Schema.Types.ObjectId, required: true },
    failedAction:  { type: String, required: true },   // e.g. "createPayrollAdjustment"
    attemptCount:  { type: Number, default: 0 },
    lastAttemptAt: { type: Date },
    error:         { type: String, default: "" }
}, { timestamps: true });

const HrRetryLogModal = mongoose.model("HrRetryLog", HrRetryLogSchema);

export default HrRetryLogModal;
