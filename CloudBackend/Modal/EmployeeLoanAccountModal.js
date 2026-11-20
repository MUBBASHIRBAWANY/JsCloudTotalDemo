import mongoose from "mongoose";

const EmployeeLoanAccountSchema = new mongoose.Schema({
    empId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, unique: true },
    name: { type: String, required: true },
    account: { type: String, default: "" },
    AccountRef: { type: String, default: "" },
    Store: { type: String, default: "0" }
}, { timestamps: true, collection: "EmployeeLoanAccount" });

const EmployeeLoanAccountModal = mongoose.model("EmployeeLoanAccount", EmployeeLoanAccountSchema);

export default EmployeeLoanAccountModal;
