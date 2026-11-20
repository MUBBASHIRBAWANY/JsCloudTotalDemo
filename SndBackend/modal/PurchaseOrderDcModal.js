import mongoose from "mongoose";


const PurchaseOrderDcSchema = mongoose.Schema({
    DCCode: {
        type: String,
        Unique: true,
        required: true

    },
    DCData: {
        type: Array,
        required: true
    },
    Distrbutor: {
        type: String,
        required: true
    },
    DCDate: {
        type: String,
        required: true
    },

    PostStatus: {
        type: String,
        required: true
    },

})

const PurchaseOrderDcModal = mongoose.model('OrderDc', PurchaseOrderDcSchema)

export default PurchaseOrderDcModal