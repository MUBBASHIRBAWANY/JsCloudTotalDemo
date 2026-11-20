import mongoose from "mongoose";

const EmployeeBadDebtAccountSchema = new mongoose.Schema({
    empId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true, unique: true },
    name: { type: String, required: true },
    account: { type: String, default: "" }
}, { timestamps: true, collection: "EmployeeBadDebtAccount" });

const EmployeeBadDebtAccountModal = mongoose.model("EmployeeBadDebtAccount", EmployeeBadDebtAccountSchema);

export default EmployeeBadDebtAccountModal;
