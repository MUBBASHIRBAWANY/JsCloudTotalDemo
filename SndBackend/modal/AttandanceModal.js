import mongoose from "mongoose";

const AttandanceSchema = new mongoose.Schema({
    orderBookerId: {
        type: String,
        required: true,
    },
    UserId: {
        type: String,
    },
    imageUrl: {
        type: String,
        required: true,
    },
    latitude: {
        type: String,
        required: true,
    },
    longitude: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        required: true,
    },
    date: {
        type: String,
        required: true,
    },
    markingType: {
        type: String,
    },
    distributorId: {
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
});

const AttandanceModal = mongoose.model("Attandance", AttandanceSchema);

export default AttandanceModal;
