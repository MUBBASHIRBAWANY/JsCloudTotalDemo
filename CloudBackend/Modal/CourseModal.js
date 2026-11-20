import mongoose from "mongoose";

/**
 * Course modal for Training & Development (LMS) module.
 * Requirements 5.1, 5.4, 5.5
 */
const CourseSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Course title is required"],
        minlength: [1, "Title must be at least 1 character"],
        maxlength: [200, "Title must not exceed 200 characters"]
    },
    description: {
        type: String,
        required: [true, "Course description is required"],
        minlength: [1, "Description must be at least 1 character"],
        maxlength: [2000, "Description must not exceed 2000 characters"]
    },
    category: {
        type: String,
        required: [true, "Course category is required"]
    },
    deliveryMode: {
        type: String,
        enum: ["in-person", "online", "on-the-job"],
        required: [true, "Delivery mode is required"]
    },
    durationHours: {
        type: Number,
        required: [true, "Duration in hours is required"],
        min: [0.5, "Duration must be at least 0.5 hours"],
        max: [999, "Duration must not exceed 999 hours"]
    },
    materials: {
        type: [String],
        default: [],
        validate: {
            validator: (arr) => arr.length <= 20,
            message: "A course may have at most 20 materials"
        }
    },
    passingCriteria: {
        type: String,
        enum: ["attendance", "test_score", "both"],
        required: [true, "Passing criteria is required"]
    },
    // Whether completing this course triggers a Certification record — Requirement 5.6
    hasCertification: {
        type: Boolean,
        default: false
    },
    // Required when passingCriteria is "test_score" or "both"
    passingThreshold: {
        type: Number,
        min: [0, "Passing threshold must be 0 or higher"],
        max: [100, "Passing threshold must not exceed 100"],
        validate: {
            validator: function (val) {
                if (this.passingCriteria === "test_score" || this.passingCriteria === "both") {
                    return val != null;
                }
                return true;
            },
            message: "Passing threshold is required when passing criteria is test_score or both"
        }
    }
}, { timestamps: true });

const CourseModal = mongoose.model("HrCourse", CourseSchema);

export default CourseModal;
