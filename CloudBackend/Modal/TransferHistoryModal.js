import mongoose from "mongoose";

const TransferHistorySchema = new mongoose.Schema({
    employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "HrEmployee", required: true },
    fromDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDepartment" },
    toDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDepartment" },
    fromDesignationId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDesignation" },
    toDesignationId: { type: mongoose.Schema.Types.ObjectId, ref: "HrDesignation" },
    fromStoreId: { type: String, default: null },
    toStoreId: { type: String, default: null },
    transferDate: { type: Date, required: true },
    reason: { type: String, default: "" },
    transferredBy: { type: String, default: "" }
}, { timestamps: true });

const TransferHistoryModal = mongoose.model("HrTransferHistory", TransferHistorySchema);
export default TransferHistoryModal;
