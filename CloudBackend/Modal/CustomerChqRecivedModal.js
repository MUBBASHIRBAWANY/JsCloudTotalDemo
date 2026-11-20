    import mongoose from "mongoose";

const CustomerChqRecivedSchema = mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    ChqDate: {
        type: String,
        required: true
    },
    table: {
        type: Array,
        required: true
    },
    grouped: {
        type: Array,
        required: true
    },
    Customer: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    Store : {
        type: String,
    }

})

const CustomerChqRecivedModal = mongoose.model("CustomerChqRecived", CustomerChqRecivedSchema)

export default CustomerChqRecivedModal