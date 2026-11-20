import mongoose from "mongoose";

const EBFOpeningSchema = mongoose.Schema({
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

const EBFOpeningModal = mongoose.model("EBF-Opening", EBFOpeningSchema);

export default EBFOpeningModal;
