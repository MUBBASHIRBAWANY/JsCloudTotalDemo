import mongoose from "mongoose";

const OrderBookerpaymentRcvd = new mongoose.Schema({
    PaymentDate: {
        type: String,
        required: true,
    },
    clientPayments: {
        type: Array,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    totalAmount: {
        type: String,
        required: true
    },
    bank : {
        type: String,
        required: true
    },
    receivedBy : {
        type: String,
        required: true
    },
    PaymentNumber : {
        type: String,
        required: true
    },
    Remarks : {
        type: String,
    },
    Status : {
        type: String,
        required: true
    },
    Ref :{
        type: String,
    }

})

const OrderBookerpaymentRcvdModal = mongoose.model("OrderBookerpaymentRcvd", OrderBookerpaymentRcvd)

export default OrderBookerpaymentRcvdModal