import mongoose from "mongoose";

const DistrbutorSchema = new mongoose.Schema({
  DistrbutorSystemCode: { type: String, required: true },
  DistrbutorName: { type: String, required: true },

  OwnerName: String,
  OwnerCnic: String,

  ContactPerson1: String,
  ContactPerson2: String,
  ContactPerson3: String,
  Designation: String,

  Address1: String,
  Address2: String,
  Address3: String,

  CNICNo: String,
  Country: String,
  Province: String,
  City: String,

  MobileNo: String,
  MobileNo2: String,
  CountryCode: String,

  PostalCode: String,
  Fax: String,

  Channel: String,

  PrimaryEmail: String,
  SecondaryEmail: String,
  WebSite: String,

  LoginID: String,
  Password: String,

  Type: String,
  ShopRegisterDate: String,

  NTN: String,
  NTNStatus: String,
  STN: String,
  STNStatus: String,

  CreditLimit: String,
  CreditDays: String,

  TransportType: String,
  CompanyType: String,

  BankName: String,
  BranchName: String,
  BranchCode: String,
  BranchCity: String,
  BranchAddress: String,
  BranchTelNo: String,

  BusinessAccountNumber: String,
  IBAN: String,
  Transporter: String,
  Status: String,
  Status : String,
  PriceList : String,
  OrderBooker : String,
  advanceDiscountPolicy: { type: String, default: "" },
});

const DistrbutorModal = mongoose.model("Distrbutor", DistrbutorSchema);
export default DistrbutorModal;
