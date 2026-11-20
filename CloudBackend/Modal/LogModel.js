import mongoose from "mongoose";

const LogSchema = new mongoose.Schema({
    VoucherNumber: { type: String, required: true },
    createdBy: { type: String },
    createdAt: {type: String , default: new Date().toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
        day: "2-digit",
        month: "short",
        year: "numeric",
    })},
        type: { type: String },
        changes : { type: Object },
});

const LogModel = mongoose.model("Log", LogSchema);
export default LogModel;
