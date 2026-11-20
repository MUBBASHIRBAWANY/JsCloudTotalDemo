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
    
    PhoneNumber: {
        type: String,
    },
    Cnic: {
        type: String,
    },
    Address: {
        type: String,
    },
   
    OrderBookerID :{
        type: String,
        Unique : true
    },
    OrderBookerPassword :{
        type: String,
    },
    OtpUpdate : {
        type : Boolean,
        default : false,
    }

})

const OrderBookerModal = mongoose.model("Ditributor-OrderBooker", OrderBookerSchema)

export default OrderBookerModal