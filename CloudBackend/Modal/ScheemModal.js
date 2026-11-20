import mongoose from "mongoose";



const ShceemSchema = new mongoose.Schema(

{
     priceLists : {
        type: Array,
     },
     products : {
        type: Array,
     }, 
     startDate : {
        type: String,
     }, 
     endDate:{
        type: String,
     }, 
     schemeData : {
        type: Array,
     } }
);


// Compound index so the Invoice Aging / receivable queries (which filter by
// PostStatus + Store and range-scan ShceemDate) don't do a full
// collection scan over years of invoices.
ShceemSchema.index({ PostStatus: 1, Store: 1, ShceemDate: 1 }, { background: true })

const ShceemModal = mongoose.model('Shceem', ShceemSchema)

export default ShceemModal