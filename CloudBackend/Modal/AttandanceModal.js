import mongoose from "mongoose";

const AttandanceSchema = new mongoose.Schema({
    UserId: {
        type: String,
        required: true
    },
    imageUrl: {
        type: String,
        required: true
    },
    latitude: {
        type: String,
        required: true
    },
    longitude: {
        type: String,
        required: true
    },
    time: {
        type: String,
        required: true

    },
    date : {
        type: String,
        required: true
    },
    markingType: {
        type: String,
    },
    location : {
        type: String,
    },
    Exrtact :{
        type: String,

    },
    bookername: {
        type: String,
    },
    image: {
        type: String,
    },
    uri: {
        type: String,
    },
    orderBookerId: {
        type: String,
    },
   
})

const AttandanceModal = mongoose.model("Attandance", AttandanceSchema)

export default AttandanceModal