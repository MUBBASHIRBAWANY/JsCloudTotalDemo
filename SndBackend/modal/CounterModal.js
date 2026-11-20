import mongoose from "mongoose";

const Counter = new mongoose.Schema({
    name: { type: String, required: true, unique: true }, // e.g., "saleOrder"
    sequence_value: { type: Number, default: 0 }
});

const CounterModal = mongoose.model('Counter', Counter);

export default CounterModal;



// const ChqSchema = new mongoose.Schema({
//     Customer: {
//         type: String,
//         required: true
//     },

//     ChqNumber: {
//         type: String,
//         required: true
//     },
//     Amount: {
//         type: String,
//     },
//     ChqDate: {
//         type: String,

//     },
//     Status: {
//         type: String,

//     },
//     SalesInvoice: {
//         type: String,

//     },
//     Distrbutor : {
//         type: String,
        
//     }

// })
