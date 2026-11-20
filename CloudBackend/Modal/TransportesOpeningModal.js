import mongoose from "mongoose";


const TransporterOpeningBalanceSchema = mongoose.Schema({
    DateStart :{
        type : String,
        Unique : true,
        require : true
    },
    DateEnd :{
        type : String,
        Unique : true,  
        require : true
    },
    TransporterData : {
        type : Object,
        require : true
    },
      Status : {
        type : String,
        require : true
    }
})

const TransporterOpeningBalanceModal = mongoose.model("Transporter-Opening" , TransporterOpeningBalanceSchema)

export default TransporterOpeningBalanceModal