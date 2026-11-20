import mongoose from "mongoose";

/**
 * Salary Increment Proposal — created when a manager finalizes a performance review.
 * Requirements 4.9, 4.10
 *
 * On approval the controller atomically updates HrEmployee.salarySetupBasket.basicSalary
 * and creates a SalaryHistory record within a Mongoose session/transaction.
 */
const SalaryIncrementProposalSchema = new mongoose.Schema(
    {
        cycleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "AppraisalCycle",
            required: true,
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            required: true,
        },
        proposedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            required: true,
        },
        incrementType: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true,
        },
        incrementValue: {
            type: Number,
            required: true,
            min: 0,
        },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "HrEmployee",
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

const SalaryIncrementProposalModal = mongoose.model(
    "SalaryIncrementProposal",
    SalaryIncrementProposalSchema
);

export default SalaryIncrementProposalModal;
