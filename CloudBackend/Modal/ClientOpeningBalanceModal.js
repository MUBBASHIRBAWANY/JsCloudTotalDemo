import mongoose from "mongoose";


const ClientOpeningBalanceSchema = mongoose.Schema({
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
    ClientData : {
        type : Object,
        require : true
    },
      Status : {
        type : String,
        require : true
    }
})

// Sundry Debtor / client ledgers — FY opening window lookup
ClientOpeningBalanceSchema.index(
    { DateStart: 1, DateEnd: 1 },
    { background: true }
);

const ClientOpeningBalanceModal = mongoose.model("Client-Opening" , ClientOpeningBalanceSchema)

export default ClientOpeningBalanceModal