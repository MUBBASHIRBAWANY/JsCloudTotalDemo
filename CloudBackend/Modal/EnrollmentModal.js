import mongoose from "mongoose";

/**
 * Enrollment modal for Training & Development (LMS) module.
 * Requirements 5.3, 5.4, 5.5
 */
const EnrollmentSchema = new mongoose.Schema({
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrCourse",
        required: [true, "Course reference is required"]
    },
    planId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrTrainingPlan",
        required: [true, "Training plan reference is required"]
    },
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "EmployeeHr",
        required: [true, "Employee reference is required"]
    },
    status: {
        type: String,
        enum: ["enrolled", "completed", "failed"],
        default: "enrolled"
    },
    completionDate: {
        type: Date
    },
    // 0–100; recorded when passingCriteria includes "test_score" or "both"
    score: {
        type: Number,
        min: [0, "Score must be 0 or higher"],
        max: [100, "Score must not exceed 100"]
    }
}, { timestamps: true });

const EnrollmentModal = mongoose.model("HrEnrollment", EnrollmentSchema);

export default EnrollmentModal;
