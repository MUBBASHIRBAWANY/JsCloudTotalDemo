import mongoose from "mongoose";

 const CustomorSchema = new mongoose.Schema({
   code :{
        type : String,
        required : true
    },
    mastercode : {
        type : String
    },
    CustomorName : {
        type: String,
        required : true,    
    },
 OrderBooker: {
        type: String,
        require : true
    },
    phone :{
        type : String
    },
    email : {
        type : String
    },
    SalesFlowRef : {
        type : String
    },
    Address : {
        type : String
    },
    NTN : {
        type : String
    },
    STN : {
        type : String
    }, 
    Fax : {
        type : String
    },
    WebSite : {
        type : String
    }, 
    ShopOwner : {
        type : String
    },
    ShopRegisterDate : {
        type : String
    },
    Terrotory  : {
        type : String
    },
    Distributor  : {
        type : String,
        required : true
    },
    Locality : {
        type : String
    },
    
    ChannelType : {
        type : String
    }, 
    Chanel : {
        type : String
    },
    SubChannel : {
        type : String
    },
    AdvanceTaxApply : {
        type : String
    },
    Filler : {
        type : String
    },
    Registered : {
        type : String
    },
    Status : {
        type : String
    },
    TTS : {
        type : String
    },
    TradeActivity : {
        type : String
    },
    VDS : {
        type : String        
    },
    Tradeoffer : {
        type : String
    },
    JBP : {
        type : String
    },
     OwnerCnic : {
        type : String
    } ,
    PriceList:{
        type : String

    },
    OrderBooker:{
        type : String
    },
    latitude:{
        type : String
    },
     longitude : {
        type : String

     }


 })


 const CustomorModal = mongoose.model('Customor', CustomorSchema)

 export default CustomorModal