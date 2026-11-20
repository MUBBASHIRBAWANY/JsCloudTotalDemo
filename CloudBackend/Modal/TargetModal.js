import mongoose from "mongoose";

const TargetSchema = new mongoose.Schema({
    Code: {
        type: String,
        required: true
    },
    Month: {
        type: String,
        required: true
    },
    Remarks :{
        type: String,
        
    },
    OrderBooker: {
        type: String,
        required: true
    },
    TargetData: {
        type: Array,
        required: true
    },

})

const TargetModal = mongoose.model("Target", TargetSchema)

export default TargetModal