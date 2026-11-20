import mongoose from "mongoose";

/**
 * 360° Feedback — structured feedback submitted by a reviewer about a reviewee.
 * Requirements 4.6, 4.7, 4.13
 *
 * Custom validator on revieweeId ensures a reviewer cannot submit feedback
 * about themselves (reviewerId !== revieweeId).
 */
const FeedbackSchema = new mongoose.Schema(
    {
        cycleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AppraisalCycle",
            required: true,
        },
        reviewerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            required: true,
        },
        revieweeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            required: true,
            validate: {
                validator: function (value) {
                    // Requirement 4.13 — reviewer cannot review themselves
                    return this.reviewerId.toString() !== value.toString();
                },
                message: "Reviewer and reviewee cannot be the same employee.",
            },
        },
        relationship: {
            type: String,
            enum: ["peer", "subordinate", "manager"],
            required: true,
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
            required: true,
        },
        comment: { type: String, trim: true },
    },
    { timestamps: true }
);

const FeedbackModal = mongoose.model("Feedback", FeedbackSchema);

export default FeedbackModal;
