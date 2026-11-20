import mongoose, { Types } from "mongoose";


const DistrbutorSchema = ({
    DistrbutorSystemCode: {
        type: String,
        required: true,
        Uniqe : true

    },
    DistrbutorName: {
        type: String,
        required: true
    },

    OwnerName: {
        type: String,

    },
    OwnerCnic: {
        type: String,
    },
    ContactPerson1: {
        type: String,

    },
    ContactPerson2: {
        type: String,
    },
    ContactPerson3: {
        type: String,
    },
    Designation: {
        type: String,
    },
    Address1: {
        type: String,
    },
    Address2: {
        type: String,
    },
    Address3: {
        type: String,
    },
    CNICNo: {
        type: String,
    },
    Country: {
        type: String,
    },
    Province: {
        type: String,
    },
    MobilePhoneNo: {
        type: String,
    },
    MobilePhoneNo2: {
        type: String,
    },
    CountryCode: {
        type: String,
    },
    PostalCode: {
        type: String,
    },
    Fax: {
        type: String,
    },
    
    PrimaryEmail: {
        type: String,
    },
    SecondaryEmail: {
        type: String,
    },
    WebSite: {
        type: String,
    },
    LoginID: {
        type: String,
    },
   
    Password: {
        type: String,
    },
    ShopRegisterDate: {
        type: String,
    },
    NTN: {
        type: String,
    },
    STN: {
        type: String,
    },
    NTNStatus : {
        type: String,
    },
    STNStatus : {
        type: String,
    },
    CompanyType : {
        type: String,
    },
    CreditDays : {
        type: String,
    },
    BankName : {
        type: String,
    },
    BranchName : {
        type: String,
    },
    BranchCode : {
        type: String,
    },
    BusinessAccountNumber : {
        type: String,
    },
    BranchAddress : {
        type: String,
    },
    BranchTelNo : {
        type: String,
    },
    BranchCity : {
        type: String,
    },
    IBAN : {
        type: String,
    },
    Status:{
        type: String,
    },
    ShortCode : {
        type: String,
    }
})

const DistrbutorModal = mongoose.model('Distrbutor', DistrbutorSchema)
export default DistrbutorModal