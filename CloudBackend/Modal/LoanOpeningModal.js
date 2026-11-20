import mongoose from "mongoose";

const LoanOpeningSchema = mongoose.Schema({
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

const LoanOpeningModal = mongoose.model("Loan-Opening", LoanOpeningSchema);

export default LoanOpeningModal;
