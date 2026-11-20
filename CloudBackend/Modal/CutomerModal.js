import mongoose from "mongoose";

 const CutomerSchema = new mongoose.Schema({
   code :{
        type : String,
        required : true
    },
    mastercode : {
        type : String
    },
    CutomerName : {
        type: String,
        required : true,    
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
    Vendor  : {
        type : Array,
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
    },
    PriceList : {
        type : String
    },
    Store : {
        type : String
    }

 })

 CutomerSchema.index({ Store: 1 });


 const CutomerModal = mongoose.model('Cutomer', CutomerSchema)

 export default CutomerModal