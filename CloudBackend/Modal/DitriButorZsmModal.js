import mongoose from "mongoose";

const ZsmSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
    },
    ZsmName: {
        type: String,
        required: true
    },
    Zone : {
        type: String,
        required: true
    },
    PhoneNumber: {
        type: String,
    },
    Cnic: {
        type: String,
    },
    Address: {
        type: String,
    },
   
    ZsmID :{
        type: String,
        Unique : true
    },
    ZsmPassword :{
        type: String,
    },
    OtpUpdate : {
        type : String
    }

})

const ZsmModal = mongoose.model("Ditributor-Zsm", ZsmSchema)

export default ZsmModal