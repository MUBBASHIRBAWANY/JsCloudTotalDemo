import mongoose from "mongoose";


const DistrbutorInvoiceSchema = mongoose.Schema({
    DitributorInvoiceCode: {
        type: String,
        unique: true,
        required: true

    },
    InvoiceData: {
        type: Array,
        required: true
    },
    Distrbutor: {
        type: String,
        required: true
    },
    InvoiceDate: {
        type: String,
        required: true
    },

    PostStatus: {
        type: String,
        required: true
    },

    Store: {
        type: String,
        required: true
    },
    DcNumber: {
        type: String,
        unique: true,
        required: true
    },
    Remaining: {
         type: Number,
        default: 0,
        min: [0, "Remaining amount cannot be negative"],
        validate: {
            validator: function (value) {
                return value <= this.TotalAmount;
            },
            message: "Remaining amount cannot be greater than Total amount"
        }
    },
    RecivedAmount: {
       type: Number,
        default: 0,
        min: [0, "Received amount cannot be negative"],
        validate: {
            validator: function (value) {
                return value <= this.TotalAmount;
            },
            message: "Received amount cannot be greater than Total amount"
        }
    },
    TotalAmount: {
        type: Number,
        default: 0,
        min: [0, "Total amount cannot be negative"]
    },
    AddAmount:{
        type: String,
    },
    LessAmount:{
        type: String,
    },
    LessAdvanceDis:{
        type: String,
    },
    PerDiscount:{
        type: String,
    }
})

DistrbutorInvoiceSchema.index({ InvoiceDate: 1, Distrbutor: 1 });
DistrbutorInvoiceSchema.index({ DcNumber: 1 });

const DistrbutorInvoiceModal = mongoose.model('DistrbutorInvoice', DistrbutorInvoiceSchema)

export default DistrbutorInvoiceModal