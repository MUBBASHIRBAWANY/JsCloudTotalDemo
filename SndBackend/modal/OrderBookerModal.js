import mongoose from "mongoose";

const OrderBookerSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
    },
    OrderBookerName: {
        type: String,
        required: true
    },
    Distributor: {
        type: String,
        required: true
    },

    PhoneNumber: {
        type: String,
    },
    Cnic: {
        type: String,
    },
    Address: {
        type: String,
    },
    
    OrderBooker: {
        type: String
    },
    LoginId: {

        type: String,
        Unique: true,
        required: true,

    },
    passord: {
        type: String,
        Unique: true,
        required: true,

    },
    OtpUpdate: {
        type: Boolean,
        default: false,
    },
    loginAllow: {
        type: Boolean,
        default: false
    }
})

const OrderBookerModal = mongoose.model("Product-OrderBooker", OrderBookerSchema)

export default OrderBookerModal