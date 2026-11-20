import mongoose from "mongoose";

const PriceListSchema = new mongoose.Schema({
    PriceListDate: {
        type: String,
        required: true
    },
    PriceListName: {
        type: String,
        required: true
    },
    PriceListData: {
        type: Array,
        required: true
    },
    PriceListNumber: {
        type: String,
        required: true
    },
    PriceListStatus: {
        type: String,
        required: true,
    },
    SchemeDateFrom: {
        type: String,
    },
    SchemeDateTo: {
        type: String,
    },
})

const PriceListModal = mongoose.model("PriceList", PriceListSchema)

export default PriceListModal