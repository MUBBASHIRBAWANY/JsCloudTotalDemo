import mongoose from "mongoose";

const NewYearClientOpeningTransferSchema = mongoose.Schema({
    DateStart: {
        type: String,
        required: true
    },
    DateEnd: {
        type: String,
        required: true
    },
    Status: {
        type: String,
        required: true
    },
    TransferData: {
        type: Object,
        required: true
    }
})

const NewYearClientOpeningTransferModal = mongoose.model("NewYearClientOpeningTransfer", NewYearClientOpeningTransferSchema)

export default NewYearClientOpeningTransferModal
