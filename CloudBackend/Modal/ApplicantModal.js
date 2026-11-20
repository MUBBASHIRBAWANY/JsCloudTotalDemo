import mongoose from "mongoose";

/**
 * Applicant — Requirements 1.4, 1.5, 1.6, 1.7
 * Tracks candidates applying to a Job Posting through the interview pipeline.
 */
const ApplicantSchema = new mongoose.Schema({
    jobPostingId: { type: mongoose.Schema.Types.ObjectId, ref: "HrJobPosting" },
    fullName: { type: String, required: true },
    email: { type: String, default: "" },
    phone: { type: String, default: "" },
    cvFileRef: { type: String, default: "" },   // PDF/DOC/DOCX, max 5 MB (enforced at controller level)
    source: { type: String, enum: ["walk-in", "referral", "portal", "LinkedIn"] },
    applicationDate: { type: Date, default: Date.now },
    currentStage: { type: String, default: "Applied" },  // must match a stage in the posting's pipelineStages

    // Populated when stage is "Interview Scheduled" — Requirement 1.6
    interviewRecord: {
        interviewerId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee" },
        date: { type: Date },
        time: { type: String, default: "" },    // HH:MM string
        mode: { type: String, enum: ["in-person", "video", "phone"] },
        notes: { type: String, default: "" }
    },

    // Populated when stage is "Offer Extended" — Requirement 1.7
    offerLetter: {
        positionTitle: { type: String, default: "" },
        salary: { type: Number, default: 0 },
        joiningDate: { type: Date },
        probationMonths: { type: Number, min: 0, max: 24, default: 0 }
    }
}, { timestamps: true });

const ApplicantModal = mongoose.model("HrApplicant", ApplicantSchema);

export default ApplicantModal;
