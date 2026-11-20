import mongoose from "mongoose";

/**
 * Clearance Checklist — Requirements 7.3, 7.4, 7.5
 * Tracks departmental handover tasks that must be completed before final settlement.
 * Linked to a SeparationRequest via separationRequestId.
 */
const ClearanceTaskSchema = new mongoose.Schema({
    taskName:    { type: String, required: true },
    assignedTo:  { type: mongoose.Schema.Types.ObjectId, default: null },  // department or user ref
    isComplete:  { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    completedAt: { type: Date, default: null }
}, { _id: true });

const ClearanceChecklistSchema = new mongoose.Schema({
    separationRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrSeparationRequest",
        required: true
    },
    tasks: {
        type: [ClearanceTaskSchema],
        default: []
    }
}, { timestamps: true });

const ClearanceChecklistModal = mongoose.model("HrClearanceChecklist", ClearanceChecklistSchema);

export default ClearanceChecklistModal;
