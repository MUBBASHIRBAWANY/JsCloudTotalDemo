import mongoose from "mongoose";

const LocalitySchema = new mongoose.Schema({
    code: {
        type: String,
        required: true
    },
    LocalityName: {
        type: String,
        required: true
    },

})

const LocalityModal = mongoose.model("Locality", LocalitySchema)

export default LocalityModal