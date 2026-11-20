import mongoose from "mongoose";

const ReligionSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true, unique: true }
}, { timestamps: true });

const ReligionModal = mongoose.model("HrReligion", ReligionSchema);
export default ReligionModal;
