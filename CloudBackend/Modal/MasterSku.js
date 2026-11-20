import mongoose from "mongoose";

const MasterSkuSchema = new mongoose.Schema({
    code : {
        type : String,
        required : true
    },
    MasterSkuName : {
        type : String,
        required : true
    },
    Brand : {
        type : String,
        unique : true,
        required : true
    },
    mastercode : {
        type : String,
        unique : true,
        required : true
    },
    salesFlowRef : {
        type : String,
        required : true
    },
    CodeRef : {
        type : String,
    }

})

const MasterskuModal = mongoose.model("Product-MasterSku", MasterSkuSchema)

export default MasterskuModal