import mongoose from "mongoose";

const VoucherSchema = new mongoose.Schema({
    VoucherNumber: {
        type: String,
        required: true,
        unique: true
    },
    VoucherType: {
        type: String,
        required: true
    },
    VoucherDate: {
        type: String,
        required: true
    },
    VoucharData: {
        type: Array,
        default: []
    },
    VoucherMainAccount: {
        type: String
    },
    DebitAccount: {
        type: String
    },
    CreditAccount: {
        type: String
    },
    TotalDebit: {
        type: Number,
        default: 0
    },
    TotalCredit: {
        type: Number,
        default: 0
    },
    Cheque: {
        type: String
    },
    Remarks: {
        type: String
    },
    status: {
        type: String,
        default: "Post"
    },
    invoiceData: {
        type: Array,
        default: []
    },
    Distrbutor: {
        type: String
    }
});

const VoucherModal = mongoose.model("Voucher", VoucherSchema);

export default VoucherModal;
