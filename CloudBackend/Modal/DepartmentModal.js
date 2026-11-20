import mongoose from "mongoose";

const DepartmentSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        unique: true
    },
    description: {
        type: String,
        default: ""
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    }
})

const DepartmentModal = mongoose.model("HrDepartment", DepartmentSchema)

export default DepartmentModal
