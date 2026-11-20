import mongoose from "mongoose";

const TransporterSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    TransporterName: {
        type: String,
        required: true
    },
    OldCode: {
        type: String,
        required: true
    },
    Accounts : {
        type: String,
    }

})

const TransporterModal = mongoose.model("Transporter", TransporterSchema)

export default TransporterModal