import mongoose from "mongoose";

const BadDebtSchema = mongoose.Schema({
    DateStart: {
        type: String,
        required: true
    },
    DateEnd: {
        type: String,
        required: true
    },
    EmployeesData: {
        type: Object,
        required: true
    },
    Status: {
        type: String,
        required: true
    }
});

const BadDebtModal = mongoose.model("HrBadDebt", BadDebtSchema);
export default BadDebtModal;
