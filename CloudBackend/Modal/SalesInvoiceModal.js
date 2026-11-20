import mongoose from "mongoose";



const SalesInvoiceSchema = new mongoose.Schema({
    SalesInvoice: {
        type: String,
        unique: true
    },

    OrderBooker: String,

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

    SalesFlowRef: {
        type: String,
        required: true,
        Unique: true,
        unique: true,
    },

    PostStatus: {
        type: Boolean,
        required: true
    },

    Store: {
        type: String,
        required: true
    },

    Location: {
        type: String,
        required: true
    },

    RemainingAmount: {
        type: Number,
        default: 0,
        min: [0, "Remaining amount cannot be negative"],
       
    },

    RecivedAmount: {
        type: Number,
        default: 0,
        min: [0, "Received amount cannot be negative"],
       
    },

    TotalAmount: {
        type: Number,
        default: 0,
        min: [0, "Total amount cannot be negative"]
    },

    PaymentDetail: Array,

    TTS: {
        type: Number,
        default: 0
    },
    Remarks : {
        type : String,
    },
    Shortage : {
        type : Number,
        default : 0 
    }
});


// Compound index so the Invoice Aging / receivable queries (which filter by
// PostStatus + Store and range-scan SalesInvoiceDate) don't do a full
// collection scan over years of invoices.
SalesInvoiceSchema.index({ PostStatus: 1, Store: 1, SalesInvoiceDate: 1 }, { background: true })
// Store Ledger batch enrich by invoice number
SalesInvoiceSchema.index({ SalesInvoice: 1 }, { background: true })

const SalesInvoiceModal = mongoose.model('SalesInvoice', SalesInvoiceSchema)

export default SalesInvoiceModal