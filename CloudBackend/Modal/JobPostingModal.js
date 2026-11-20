import mongoose from "mongoose";

/**
 * Job Posting — Requirement 1.1
 * Tracks vacancy announcements with pipeline stage configuration.
 */
const JobPostingSchema = new mongoose.Schema({
    title: { type: String, required: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDepartment" },
    designationId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDesignation" },
    qualifications: { type: String, default: "" },
    experienceLevel: { type: String, enum: ["entry", "mid", "senior"] },
    employmentType: { type: String, enum: ["permanent", "contract", "intern"] },
    deadline: { type: Date, required: true },
    openings: {
        type: Number,
        min: [0, "Number of openings must be a non-negative integer"],
        validate: {
            validator: (v) => Number.isInteger(v) && v >= 0,
            message: "Number of openings must be a non-negative integer"
        }
    },
    status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
    pipelineStages: {
        type: [String],
        default: [
            "Applied",
            "Shortlisted",
            "Interview Scheduled",
            "Interviewed",
            "Offer Extended",
            "Hired",
            "Rejected"
        ]
    }
}, { timestamps: true });

const JobPostingModal = mongoose.model("HrJobPosting", JobPostingSchema);

export default JobPostingModal;
