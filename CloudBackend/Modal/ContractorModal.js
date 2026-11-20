import mongoose from "mongoose";

const ContractorSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    contactInfo: { type: String, default: "" },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const ContractorModal = mongoose.model("HrContractor", ContractorSchema);
export default ContractorModal;
