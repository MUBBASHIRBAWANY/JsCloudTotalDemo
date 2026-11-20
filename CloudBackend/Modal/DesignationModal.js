import mongoose from "mongoose";

const DesignationSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "HrDepartment",
        default: null
    },
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        default: ""
    }
})

const DesignationModal = mongoose.model("HrDesignation", DesignationSchema)

export default DesignationModal
