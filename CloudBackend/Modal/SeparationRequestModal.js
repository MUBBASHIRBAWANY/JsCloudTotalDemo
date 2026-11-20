import mongoose from "mongoose";

/**
 * Separation Request — Requirements 7.1, 7.3, 7.4, 7.5
 * Records an employee's resignation, termination, retirement, or contract-end.
 * lastWorkingDate must be >= noticePeriodStartDate (enforced at controller level per 7.1).
 */
const SeparationRequestSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrEmployee",
        required: true
    },
    separationType: {
        type: String,
        enum: ["resignation", "termination", "retirement", "contract-end"],
        required: true
    },
    noticePeriodStartDate: {
        type: Date,
        required: true
    },
    lastWorkingDate: {
        type: Date,
        required: true
    },
    reason: {
        type: String
    },
    status: {
        type: String,
        enum: ["pending", "cleared", "settled"],
        default: "pending"
    },
    shortNoticeFlag: {
        type: Boolean,
        default: false
    },
    settlementConfirmed: {
        type: Boolean,
        default: false
    },
    settledWithError: {
        type: Boolean,
        default: false
    },
    settlementData: {
        type: Object,
        default: null
    }
}, { timestamps: true });

const SeparationRequestModal = mongoose.model("HrSeparationRequest", SeparationRequestSchema);

export default SeparationRequestModal;
