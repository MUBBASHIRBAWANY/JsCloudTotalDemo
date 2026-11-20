import mongoose from "mongoose";


const ChqBookSchema = new mongoose.Schema({
  Bank: {
    type: String,
    required: true, 
    },
    Cheuques: {
        type: Array
    },
    CheuquesStart: {
        type: String,
        required: true,
    },
    CheuquesEnd: {
        type: String,
        required: true,
    },
    Status : {
        default : "False",
        type: String,
    },
    Prefix : {
        type: String,
    },
})


const ChqBookModal = mongoose.model("ChqBook", ChqBookSchema);
export default ChqBookModal;