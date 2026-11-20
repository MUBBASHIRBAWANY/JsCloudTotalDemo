import mongoose, { Types } from "mongoose";

const totalProductModalSchema = mongoose.Schema({
    ProductName : {
        type : String,
        required : true
    },
    TotalQuantity : {
        type : Number,
        required : true,
        min : [0, "Stock negative nahi ho sakta! TotalQuantity must be >= 0"]
    },
    Distrbutor : {
        type : String,
        required : true
    },
    AvgRate :{
        type : String,
        required : true
    },
    Amount :{
        type : Number,
        required : true
    },
    Carton : {
        type : Number,
        default : 0
    },
    Box : {
        type : Number,
        default : 0
    },
    Reason : {
        type : String,
        default : ""
    },
    AdjustmentDate : {
        type : String,
        default : ""
    },
    Type : {
        type : String,
        default : ""
    }
})

const TotalProductModal =
  mongoose.models.TotalProduct ||
  mongoose.model("TotalProduct", totalProductModalSchema)
export default TotalProductModal