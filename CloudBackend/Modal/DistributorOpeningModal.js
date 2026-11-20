import mongoose from "mongoose";


const DistributorBalanceSchema = mongoose.Schema({
    DateStart: {
        type: String,
        Unique: true,
        require: true
    },
    DateEnd: {
        type: String,
        Unique: true,
        require: true
    },
    DistributorData: {
        type: Object,
        require: true
    },
    Status: {
        type: String,
        require: true
    }
})

const DistributorOpeningModal = mongoose.model("Distributor-Opening", DistributorBalanceSchema)

export default DistributorOpeningModal