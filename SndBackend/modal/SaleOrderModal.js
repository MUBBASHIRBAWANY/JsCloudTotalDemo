import mongoose from "mongoose";

const SaleOrderSchema = new mongoose.Schema({
    SaleOrderNumber: {
        type: String,
        required: true
    },
    Customer: {
        type: String,
        required: true
    },
    SaleOrderData: {
        type: Array,
        required: true
    },
    SaleOrderDate: {
        type: String,
        required: true
    },
    /** SaleOrderDate + 1 day; if Sunday (off), then Monday. */
    DeliveryDate: {
        type: String,
    },
    Distrbutor: {
        type: String,
        required: true
    },
  orderTimeInSeconds : {
        type: String,

  },
    Remarks: {
        type: String,
    },

    OrderBookerId: {
        type: String,
        required: true
    },
    Status: {
        type: String,
        defaultvalue: false
    },
    latitude: {
        type: String,
    },
    longitude: {
        type: String,
    },
    Visit: {
        type: Boolean,
        default: false,
    },
    Images: {
        type: Array,
        default: [],
    },
    createdAt: {
        type: Date,
    },
})

const SaleOrderModal = mongoose.model("SaleOrder", SaleOrderSchema)

export default SaleOrderModal