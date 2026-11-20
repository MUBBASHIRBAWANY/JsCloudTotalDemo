import mongoose from "mongoose";

const StockAdjustmentSchema = new mongoose.Schema({
    AdjustmentNumber: {
        type: String,
        required: true
    },
    AdjustmentDate: {
        type: String,
        required: true
    },
    SalesFlowRef: {
        type: String,
        default: ""
    },
    Store: {
        type: String,
        required: true
    },
    Location: {
        type: String,
        required: true
    },
    AdjustmentData: {
        type: Array,
        required: true
    },
    PostStatus: {
        type: Boolean,
        default: false
    }
});

const StockAdjustmentModal = mongoose.model("StockAdjustment", StockAdjustmentSchema);

export default StockAdjustmentModal;
