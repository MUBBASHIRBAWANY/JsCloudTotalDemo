import mongoose from "mongoose";

/**
 * Disciplinary Action — Requirements 10.1, 10.9
 * Records formal HR responses to policy violations.
 *
 * durationDays (1–365) is required only for suspension — enforced at controller level.
 * grievanceId is optional; links the action to a prior grievance when applicable.
 */
const DisciplinaryActionSchema = new mongoose.Schema(
    {
        employeeId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      "HrEmployee",
            required: true
        },
        grievanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref:  "HrGrievance"
        },
        actionType: {
            type:     String,
            enum:     ["verbal-warning", "written-warning", "suspension", "termination"],
            required: true
        },
        reason: {
            type:     String,
            required: true
        },
        date: {
            type:     Date,
            required: true
        },
        // Required when actionType === "suspension" — enforced at controller level
        durationDays: {
            type: Number,
            min:  1,
            max:  365
        },
        issuingManagerId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      "HrEmployee",
            required: true
        }
    },
    { timestamps: true }
);

const DisciplinaryActionModal = mongoose.model("HrDisciplinaryAction", DisciplinaryActionSchema);

export default DisciplinaryActionModal;
