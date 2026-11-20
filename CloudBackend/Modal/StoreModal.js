import mongoose from "mongoose";

const storeSchema = mongoose.Schema({
    code: {
        type: String,
        requied: true
    },
    StoreName: {
        type: String,
        requied: true
    },
    Location: {
        type: String,
        requied: true
    },
    BalanceFromAging :{
        type : Boolean
    },
    StockWithoutTax :{
        type : Boolean
    },
    isActive :{
        type : Boolean
    },
})

const StoreModal = mongoose.model('store', storeSchema)

export default StoreModal