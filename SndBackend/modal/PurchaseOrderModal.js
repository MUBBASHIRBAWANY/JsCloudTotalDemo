import mongoose from "mongoose";


const PurchaseOrderSchema = mongoose.Schema({
    OrderCode: {
        type: String,
        Unique: true
    },
    OrderData: {
        type: Array,
        required: true
    },
    Distrbutor: {
        type: String,
        required: true
    },
    FromSNd : {
        type: String,
        required: true
    },
    OrderDate: {
        type: String,
        required: true
    },

    PostStatus: {
        type: String,
        required: true
    },

    TotalAmount: {
        type: Number,
        default: 0
    },
      RejectReson: {
        type: String,
    },

})

const PurchaseOrderModal = mongoose.model('PurchaseOrder', PurchaseOrderSchema)

export default PurchaseOrderModal