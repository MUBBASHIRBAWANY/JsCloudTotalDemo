import mongoose from "mongoose";

/**
 * Onboarding Checklist — Requirements 1.8, 1.9, 1.10
 * Linked to a new hire's employee record; tracks task completion during onboarding.
 */
const OnboardingTaskSchema = new mongoose.Schema({
    taskName: { type: String, required: true },
    isComplete: { type: Boolean, default: false },
    completedAt: { type: Date, default: null }
}, { _id: true });

const OnboardingChecklistSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee" },
    jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: "HrJobPosting" },
    tasks: { type: [OnboardingTaskSchema], default: [] },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    completionDate: { type: Date, default: null }
}, { timestamps: true });

const OnboardingChecklistModal = mongoose.model("HrOnboardingChecklist", OnboardingChecklistSchema);

export default OnboardingChecklistModal;
