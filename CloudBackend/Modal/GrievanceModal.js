import mongoose from "mongoose";

/**
 * Grievance — Requirements 10.1, 10.2, 10.4, 10.6, 10.9
 * Tracks employee grievance submissions, investigation workflow, and resolution.
 *
 * Anonymous handling: the toJSON transform strips complainantEmployeeId from
 * the response when isAnonymous === true AND the requestor is not an HR_Manager.
 * The controller sets doc._requestorRole before calling toJSON / serialising.
 *
 * Reference number format: GRV-YYYY-NNNN (generated at controller level).
 * investigationNotes are immutable after insert (enforced at controller level).
 */
const investigationNoteSchema = new mongoose.Schema(
    {
        text:      { type: String },
        authorId:  { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee" },
        timestamp: { type: Date, default: Date.now }
    },
    { _id: true }
);

const GrievanceSchema = new mongoose.Schema(
    {
        referenceNumber: {
            type:   String,
            unique: true
        },
        complainantEmployeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:  "HrEmployee"
        },
        isAnonymous: {
            type:    Boolean,
            default: false
        },
        subject: {
            type:      String,
            maxlength: 200,
            required:  true
        },
        category: {
            type:     String,
            enum:     ["harassment", "pay-dispute", "work-environment", "policy-violation", "other"],
            required: true
        },
        description: {
            type:      String,
            maxlength: 2000
        },
        status: {
            type:    String,
            enum:    ["submitted", "under-investigation", "closed"],
            default: "submitted"
        },
        submissionDate: {
            type:    Date,
            default: Date.now
        },
        investigatingOfficerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:  "HrEmployee"
        },
        // Immutable after insert — enforced at controller level (Requirement 10.4)
        investigationNotes: {
            type: [investigationNoteSchema],
            default: []
        },
        resolution: {
            type: String,
            enum: ["resolved", "dismissed", "escalated", "referred-to-authority"]
        },
        resolutionSummary: {
            type: String
        },
        closeDate: {
            type: Date
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(doc, ret) {
                // Strip complainantEmployeeId for anonymous grievances unless the
                // requestor is an HR_Manager. The controller sets doc._requestorRole
                // before serialisation (Requirement 10.2, 10.6).
                if (ret.isAnonymous && doc._requestorRole !== "HR_Manager") {
                    delete ret.complainantEmployeeId;
                }
                return ret;
            }
        }
    }
);

const GrievanceModal = mongoose.model("HrGrievance", GrievanceSchema);

export default GrievanceModal;
