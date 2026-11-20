import mongoose from "mongoose";

const LoadFormSchema = new mongoose.Schema({
    LoadFormNumber: {
        type: String,
        required: true
    },
    LoadFormData: {
        type: Array,
        required: true
    },
    LoadFormDate: {
        type: String,
        required: true
    },
    Distrbutor: {
        type: String,
        required: true
    },
    
    Status: {
        type: String,
        default: "open"
    }
})

const LoadFormModal = mongoose.model("LoadForm", LoadFormSchema)

export default LoadFormModal