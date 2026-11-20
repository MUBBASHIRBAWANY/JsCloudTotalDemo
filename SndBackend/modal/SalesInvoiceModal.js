import mongoose from "mongoose";


const SalesInvoiceSchema = mongoose.Schema({
    SalesInvoice: {
        type: Number,
        unique: true
    },
    OrderBooker: {
        type: String,
    },
    LoadFormNumber: {
        type: String,
    },
    SalesData: {
        type: Array,
        required: true
    },
    Client: {
        type: String,
        required: true
    },
    SalesInvoiceDate: {
        type: String,
        required: true
    },

    PostStatus: {
        type: String,
        required: true
    },
    Distrbutor: {
        type: String,
        required: true
    },
    OrderNumber: {
        type: String,
        required: true
    },
    Totalamount: {
        type: Number,
        default : 0
    },
    Remaining: {
        type: Number,
        default : 0
    },
    Recived: {
        type: Number,
        default : 0
    },
    cashAmount: {
        type: Number,
    },
    DisSalesInvoice : {
        type: String,
    },
    Chq: {
        type: Number,
    },
    ChqDate: {
        type: String,
    },
    ChqNumber:{
        type: String,

    },
    SlabDiscount : {
        type: String,

    },
                SlabPercentage:{
        type: String,

    },
                     
})

const SalesInvoiceModal = mongoose.model('SalesInvoice', SalesInvoiceSchema)

export default SalesInvoiceModal

