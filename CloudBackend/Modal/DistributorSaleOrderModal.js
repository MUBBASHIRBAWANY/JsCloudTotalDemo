import mongoose from "mongoose";

const OrderLineSchema = new mongoose.Schema({
    id: String,
    product: String,
    productName: String,
    carton: mongoose.Schema.Types.Mixed,
    box: mongoose.Schema.Types.Mixed,
    Rate: mongoose.Schema.Types.Mixed,
    rate: mongoose.Schema.Types.Mixed,
    unit: mongoose.Schema.Types.Mixed,
    GrossAmount: mongoose.Schema.Types.Mixed,
    netAmunt: mongoose.Schema.Types.Mixed,
    netAmuntWithAdvnaceTax: mongoose.Schema.Types.Mixed,
    Gst: mongoose.Schema.Types.Mixed,
    discount: mongoose.Schema.Types.Mixed,
    AfterTaxdiscount: mongoose.Schema.Types.Mixed,
    ValueAfterDiscout: mongoose.Schema.Types.Mixed,
    ValuewithGst: mongoose.Schema.Types.Mixed,
    totalBox: mongoose.Schema.Types.Mixed,
    Remaining: mongoose.Schema.Types.Mixed,
    Remaingcarton: mongoose.Schema.Types.Mixed,
    Amount: mongoose.Schema.Types.Mixed,
    perBoxAmount: mongoose.Schema.Types.Mixed,
    RetailValue: mongoose.Schema.Types.Mixed,
    PerBoxValueGrs: mongoose.Schema.Types.Mixed,
    inclGstAmnt: mongoose.Schema.Types.Mixed,
    Deliver: { type: Number, default: 0 },
    CancelBox: { type: Number, default: 0 },
}, { _id: false, strict: false });

const OrderImageSchema = new mongoose.Schema({
    filename: String,
    type: String,
    uri: String,
}, { _id: false });

const DistributorSaleOrderSchema = new mongoose.Schema({
    OrderCode: String,
    ClientOrderId: {
        type: String,
        unique: true,
        sparse: true,
    },
    kind: {
        type: String,
        default: "distributor",
    },
    OrderDate: {
        type: String,
        required: true,
    },
    SaleOrderDate: String,
    Remarks: String,
    purchase: {
        type: String,
        default: "",
    },
    Distrbutor: {
        type: String,
        required: true,
    },
    Distributor: String,
    Customer: String,
    DistrbutorName: String,
    Balance: {
        type: Number,
        default: 0,
    },
    TotalAmount: {
        type: Number,
        default: 0,
    },
    OrderData: {
        type: [OrderLineSchema],
        required: true,
    },
    Images: {
        type: [OrderImageSchema],
        default: [],
    },
    latitude: String,
    longitude: String,
    location: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        capturedAt: String,
    },
    Address: {
        type: String,
        default: "",
    },
    AddressExtracted: {
        type: String,
        default: "",
    },
    PostStatus: {
        type: String,
        required: true,
    },
    Visit: {
        type: Boolean,
        default: false,
    },
    orderThroughPhone: {
        type: Boolean,
        default: false,
    },
    UserId: String,
    OrderBookerId: String,
    RejectReson: String,
    CleareDetail: String,
    FromSNd: String,
    type: String,
    Store: String,
});

DistributorSaleOrderSchema.index({ OrderCode: -1 });
DistributorSaleOrderSchema.index({ OrderDate: 1, PostStatus: 1 });
DistributorSaleOrderSchema.index({ OrderDate: 1, Distrbutor: 1 });

const DistributorSaleOrderModal = mongoose.model("DistributorSaleOrder", DistributorSaleOrderSchema);

export default DistributorSaleOrderModal;
