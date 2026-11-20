import mongoose from "mongoose";

const GroupSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    Zone: {
        type: String,
        required: true
    },
    GroupName: {
        type: String,
        required: true
    },
})

const GroupModal = mongoose.model("Group", GroupSchema)

export default GroupModal