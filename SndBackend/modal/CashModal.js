import mongoose from "mongoose";

const CashSchema = new mongoose.Schema({
    Customer: {
        type: String,
        required: true
    },
    SlipNumber: {
        type: String,
        required: true
    },
    DisSalesInvoice : {
        type: String,
        required: true
    },
    Amount: {
        type: String,
    },
    SlipDate: {
        type: String,
        },
    SalesInvoice: {
        type: String,

    },
    Distrbutor : {
        type: String,
        
    },  
    entryDate : {
        type: String,
    } 
})

const CashModal = mongoose.model("Product-Cash", CashSchema)

export default CashModal