import mongoose from "mongoose";


const RcSchema = mongoose.Schema({
    RcCode: {
        type: String,
        Unique: true
    },

    RcData: {
        type: Array,
        required: true
    },
    Vendor: {
        type: String,
        required: true
    },
    RcDate: {
        type: String,
        required: true
    },
    SalesFlowRef: {
        type: String,
        required: true
    },
    PostStatus: {
        type: String,
        
    },
    Store: {
        type: String,
        required: true
    },
    Location: {
        type: String,
        required: true
    },
    createBy: {
        type: String,
    },
    createDate: {
        type: Date,
        default: Date.now
    }
})

const RcModal = mongoose.model('Rc', RcSchema)

export default RcModal