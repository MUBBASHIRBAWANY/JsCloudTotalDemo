import mongoose from "mongoose";

const SalaryHistorySchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrEmployee",
        required: true
    },
    previousSalary: {
        type: Number,
        default: 0
    },
    newSalary: {
        type: Number,
        default: 0
    },
    effectiveDate: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: ""
    },
    changedBy: {
        type: String,
        default: ""
    }
})

const SalaryHistoryModal = mongoose.model("HrSalaryHistory", SalaryHistorySchema)

export default SalaryHistoryModal
