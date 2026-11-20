import mongoose from "mongoose";

const EmployeeAdvanceAccountSchema = new mongoose.Schema({
    empId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, unique: true },
    name: { type: String, required: true },
    account: { type: String, default: "" }
}, { timestamps: true, collection: "EmployeeAdvanceAccount" });

const EmployeeAdvanceAccountModal = mongoose.model("EmployeeAdvanceAccount", EmployeeAdvanceAccountSchema);

export default EmployeeAdvanceAccountModal;

