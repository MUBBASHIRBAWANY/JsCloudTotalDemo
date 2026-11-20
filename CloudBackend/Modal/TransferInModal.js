import mongoose from "mongoose";
const InventoryTransferInSchema = new mongoose.Schema({
    TransferCode: {
        type: String,
        required: true
    },
    TransferInDate: {
        type: String,
        required: true
    },
    LocationFrom: {
        type: String,

    },
    LocationTo: {
        type: String,
        required: true
    },
    StoreFrom: {
        type: String,

    },
    StoreTo: {
        type: String,
        required: true
    },
    PostStatus: {
        type: String,
        required: true
    },
    TransferData: {
        type: Array,
        required: true
    },
    SalesFlowRef: {
        type: String,
        required: true
    },
    Account: {
        type: String,
    },
    TransferType: {
        type: String,
    }
});

const InventoryTransferInModal = mongoose.model('InventoryTransferIn', InventoryTransferInSchema);
export default InventoryTransferInModal;