import mongoose from "mongoose";

const PhysicalVsSystemStockSchema = new mongoose.Schema(
    {
        DocumentNumber: { type: String, required: true },
        DocumentDate: { type: String, required: true },
        FyStart: { type: String, default: "" },
        Location: { type: String, required: true },
        Store: { type: [String], default: [] },
        Remarks: { type: String, default: "" },
        StockData: { type: Array, required: true },
        Images: {
            type: [
                {
                    filename: { type: String, default: "" },
                    type: { type: String, default: "" },
                    uri: { type: String, default: "" },
                },
            ],
            default: [],
        },
        CreatedBy: { type: String, default: "" },
        PostStatus: { type: Boolean, default: false },
    },
    { timestamps: true }
);

const PhysicalVsSystemStockModal = mongoose.model(
    "PhysicalVsSystemStock",
    PhysicalVsSystemStockSchema
);

export default PhysicalVsSystemStockModal;
