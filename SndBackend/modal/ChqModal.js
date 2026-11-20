import mongoose from "mongoose";

const ChqSchema = new mongoose.Schema({
    Customer: {
        type: String,
        required: true
    },

    ChqNumber: {
        type: String,
        required: true
    },
    Amount: {
        type: String,
    },
    ChqDate: {
        type: String,

    },
    Status: {
        type: String,

    },
    DisSalesInvoice: {
        type: String,

    },
    Distrbutor : {
        type: String,
        
    },
    ReailizeDate : {
        type: String,
    },
    entryDate : {
        type: String,
    } 

})

const ChqModal = mongoose.model("Product-Chq", ChqSchema)

export default ChqModal