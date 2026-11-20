import mongoose from "mongoose";


const OrderDCSchema = mongoose.Schema({
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
    Location: {
        type: String,
        required: true
    },
    Store: {
        type: String,
        required: true
    },
    Invoice: {
        type: String,
    },
    Transporter: {
        type: String,

    },

    BiltyAmount: {
        type: String,

    },
    BiltyNumber: {
        type: String,

    },
    Biltytype: {
        type: String,

    },

})

OrderDCSchema.index({ DCCode: -1 });
OrderDCSchema.index({ DCDate: 1, PostStatus: 1 });
OrderDCSchema.index({ DCDate: 1, Distrbutor: 1 });

const OrderDcModal = mongoose.model('OrderDc', OrderDCSchema)

export default OrderDcModal