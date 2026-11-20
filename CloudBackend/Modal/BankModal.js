import mongoose from "mongoose";

const BankSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true },
    branch: { type: String, default: "" },
    active: { type: Boolean, default: true }
}, { timestamps: true });

const BankModal = mongoose.model("HrBank", BankSchema);
export default BankModal;
