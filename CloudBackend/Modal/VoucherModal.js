import mongoose from "mongoose";

const voucherSchema = new mongoose.Schema({
    VoucherType: {
        type: String,
        required: true,
    },
    Ref: {
        type: String,
    },
    VoucherNumber: {
        type: String,
        required: true,
        unique: true,
    },
    VoucherDate: {
        type: String,
        required: true,
    },
    VoucherMainAccount: {
        type: String,
    },
    VoucharData: {
        type: Array,
        required: true,
    },
    status: {
        type: String,
        default: false,
    },
    PaidFor: {
        type: String,
    },
    ChequeNumber: {
        type: String,
    },
    ChequeBook: {
        type: String,
    },
    TotalDebit: {
        type: String,

    },
    TotalCredit: {
        type: String,

    },
    PaidTo: {
        type: String,
    },
    Remarks: {
        type: String,

    },
    Type: {
        type: String,

    },
    createdBy: {
        type: String,
    },
    createDate: {
        type: String,
    }


})

voucherSchema.index({ "VoucharData.Client": 1 });
voucherSchema.index({ "VoucharData.Client": 1, VoucherDate: 1 });
voucherSchema.index({ "VoucharData.ClientRef2": 1 });
// General Ledger / Trial Balance — date + account lookups
voucherSchema.index({ VoucherDate: 1, "VoucharData.Account": 1 });
voucherSchema.index({ "VoucharData.Account": 1, VoucherDate: 1 });
voucherSchema.index({ VoucherDate: 1, VoucherType: 1 }, { background: true });
const VoucherModal = mongoose.model("Voucher", voucherSchema);
export default VoucherModal;



