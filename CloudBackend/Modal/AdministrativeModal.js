import mongoose from "mongoose";

const AdministrativeSchema = new mongoose.Schema({
    CashAccountFrom: {
        type: String,
        required: true
    },
    CashAccountTo: {
        type: String,
        required: true
    },
    BankAccountFrom: {
        type: String,
        required: true
    },
    BankAccountTo: {
        type: String,
        required: true
    },
    finishedGoods: {
        type: String,
    },
    Client: {
        type: String,
    },
    Vendor: {
        type: String,
    },
    Gst: {
        type: String,
    },
    AdvanceTax: {
        type: String,
    },
    PurchaseDiscount: {
        type: String,
    },
    RetailTradeOffer: {
        type: String,
    },
    WholeSaleTradeOffer: {
        type: String,
    },
    RetailPowerDrive: {
        type: String,
    },
    HotZoneDrive: {
        type: String,
    },
    WholeSaleDeal: {
        type: String,
    },
    DitributerDiscount: {
        type: String,
    },
    salesRevenue: {
        type: String,
    },
    WithholdingTax: {
        type: String,
    },
    COSTOFSALES: {
        type: String,
    },
    DAMAGEEXPIRECLAIM: {
        type: String,

    },
    pettyCashAccount: {
        type: String,

    },
    TTS: {
        type: String,

    },
    shortageAccount: {
        type: String,

    },
    DifferenceExpense: {
        type: String,

    },
    SubDistributionPromotion: {
        type: String,
    },
    RetailWholeSale: {
        type: String,
    },
    SpecialDiscount: {
        type: String,
    },
    HotZoneDrive: {
        type: String,
    },
    TradeOffer: {
        type: String,
    },
    UnRealizeAc: {
        type: String,
    },
    UnclaimedAc: {
        type: String,
    },
    UnclaimedAc: {
        type: String,
    },
    TransportExp: {
        type: String,
    },
    AdvanceDisCount: {
        type: String,
    },
    TransporterPayable : {
        type: String,
    },
    SpecialTO : {
        type: String,
    },
    ShortageandAccessStock : {
        type: String,
    },
    advance : {
        type: String,
    },
    loan : {
        type: String,
    },
    badDebt : {
        type: String,
    },
    ebf : {
        type: String,
    },
})


const AdministrativeModal = mongoose.model("Administrative", AdministrativeSchema)

export default AdministrativeModal