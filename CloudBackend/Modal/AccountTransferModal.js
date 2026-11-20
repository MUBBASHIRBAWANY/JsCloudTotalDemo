import mongoose from "mongoose";

const AccountTransferSchema = new mongoose.Schema({
    AccountFrom: {
        type: String,
        required: true
    },
    AccountTo: {
        type: String,
        required: true
    },
    Client: {
        type: String
    },
    Transporter: {
        type: String
    },
    transferredBy: {
        type: String
    },
    transferDate: {
        type: Date,
        default: Date.now
    }
});

const AccountTransferModal = mongoose.model("Account-Transfer", AccountTransferSchema);

export default AccountTransferModal;
