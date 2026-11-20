import mongoose from "mongoose";

const PaymentRecivedSchema = new mongoose.Schema({
    Ref: {
        type: String,
    },
    ReciptNumber: {
        type: String,
        required: true,
        unique: true,
    },
    ReciptDate: {
        type: String,
        required: true,
    },
    ReciptMainAccount: {
        type: String,
    },
    ReciptData: {
        type: Array,
        required: true,
    },
    status: {
        type: String,
        default: false,
    },
    
    Type: {
        type: String,

    },
    Voucher : {
            type: String,
    },
    RejectReson : {
            type: String,
    },
    forDis : {
            type: String,
    },


})

// Store Ledger — unposted receipts by date
PaymentRecivedSchema.index({ ReciptDate: 1, status: 1 }, { background: true });
PaymentRecivedSchema.index({ "ReciptData.ClientRef2": 1 }, { background: true });

const PaymentRecivedModal = mongoose.model("PaymentRecived", PaymentRecivedSchema);
export default PaymentRecivedModal;


