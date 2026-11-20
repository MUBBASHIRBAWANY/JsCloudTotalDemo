import mongoose from "mongoose";

const PayrollAdjustmentSchema = new mongoose.Schema({
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrEmployee",
        required: true
    },
    month: {
        type: Number,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ["bonus", "arrear", "advance-recovery", "other"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        default: ""
    },
    createdAt: {
        type: String,
        default: ""
    }
})

const PayrollAdjustmentModal = mongoose.model("HrPayrollAdjustment", PayrollAdjustmentSchema)

export default PayrollAdjustmentModal
