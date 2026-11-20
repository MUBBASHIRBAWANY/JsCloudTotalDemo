import mongoose from "mongoose";

const EBFTransactionSchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, index: true },
    payrollId: { type: mongoose.Schema.Types.ObjectId, ref: "HrPayroll", default: null },
    businessId: { type: mongoose.Schema.Types.ObjectId, default: null },
    storeId: { type: mongoose.Schema.Types.ObjectId, default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    
    transactionType: { type: String, enum: ["contribution", "withdrawal", "adjustment"], required: true },
    amount: { type: Number, required: true },
    openingBalance: { type: Number, default: 0 },
    closingBalance: { type: Number, default: 0 },
    
    salaryPeriod: {
        month: { type: Number },
        year: { type: Number }
    },
    basicSalary: { type: Number, default: 0 },
    contributionRate: { type: Number, default: 5 },
    
    referenceId: { type: String, default: "" },
    referenceType: { type: String, default: "" },
    postingDate: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "user", default: null },
    remarks: { type: String, default: "" }
}, { timestamps: true });

EBFTransactionSchema.index({ employeeId: 1, postingDate: -1 });
EBFTransactionSchema.index({ payrollId: 1 });

const EBFTransactionModal = mongoose.model("EBFTransaction", EBFTransactionSchema);

export default EBFTransactionModal;
