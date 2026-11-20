import mongoose from "mongoose";

/**
 * Training Plan modal for Training & Development (LMS) module.
 * Requirements 5.2, 5.3, 5.11
 */
const TrainingPlanSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Training plan name is required"]
    },
    // Target audience: individual employees and/or entire departments
    targetAudience: {
        employees: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "EmployeeHr" }],
            default: []
        },
        departments: {
            type: [{ type: mongoose.Schema.Types.ObjectId, ref: "HrDepartment" }],
            default: []
        }
    },
    courses: {
        type: [{ type: mongoose.Schema.Types.ObjectId, ref: "HrCourse" }],
        default: []
    },
    completionDeadline: {
        type: Date,
        required: [true, "Completion deadline is required"]
    },
    status: {
        type: String,
        enum: ["draft", "published"],
        default: "draft"
    }
}, { timestamps: true });

const TrainingPlanModal = mongoose.model("HrTrainingPlan", TrainingPlanSchema);

export default TrainingPlanModal;
