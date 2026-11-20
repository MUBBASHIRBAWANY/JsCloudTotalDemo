import mongoose from "mongoose";

const SaleOrderDcSchema = new mongoose.Schema({
    DcNumber: {
        type: String,
        required: true
    },
    Customer: {
        type: String,
        required: true
    },
    DcData: {
        type: Array,
        required: true
    },
    DcDate: {
        type: String,
        required: true
    },
    OrderNumber: {
        type: String,
        required: true
    },
    Distrbutor: {
        type: String,
        required: true
    },
    
    Status: {
        type: String,
        default: false
    }
})

const SaleOrderDcModal = mongoose.model("SaleOrderDc", SaleOrderDcSchema)

export default SaleOrderDcModal