import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true

    },
    ProductName: {
        type: String,
        required: true

    },
    MasterSKu: {
        type: String,
        required: true
    },
    mastercode: {
        type: String,
        required: true
    },
    OpeningRate: {
        type: String,
        required: true
    },
    TPPurchase: {
        type: String,
        required: true
    },
    TPSale: {
        type: String,
        required: true
    },
    SaleTaxAmount: {
        type: String,
    },
    SaleTaxPercent: {
        type: String,
    },
    BoxinCarton: {
        type: String,
        required: true
    },
    PcsinBox: {
        type: String,
        required: true
    },
    SaleTaxBy: {
        type: String,
        required: true
    },
    RetailPrice: {
        type: String,
    },
    salesFlowRef: {
        type: String,
    },
    HSCODE: {
        type: String,
    },
    GRAM: {
        type: String,
    },
    ProductMainActive: {
        type: Boolean,
        default: true
    },
    isForSND: {
        type: String,
    },
    SaleType: {
        type: String,
    },
    CodeRef: {
        type: String,
        Unique: true
    },
    PurchaseDiscountPer: {
        type: String,
    },
    OpenSindTo: {
        type: String,
    },
    ToWholSale: {
        type: String,
    },
    ToDistriButor: {
        type: String,
    },

})

const ProductModal = mongoose.model("Product", productSchema)

export default ProductModal