import mongoose from "mongoose";

// Daily snapshot of the Investment Report.
// reportDate ("YYYY-MM-DD") is unique -> one saved report per day.
// Pehli dafa generate hone par save, usi din dobara kholein to yehi
// document wapis milta hai, agle din nayi date ke sath naya record banta hai.
const SavedInvestmentReportSchema = new mongoose.Schema({
    reportDate: { type: String, required: true, unique: true }, // "YYYY-MM-DD"
    startDate: { type: String },
    endDate: { type: String },
    rows: { type: Array, default: [] },          // store-wise rows (total, payable, stockValue...)
    generatedBy: { type: String, default: "" },  // jis user ne us din pehli dafa banai
}, { timestamps: true });

const SavedInvestmentReportModal = mongoose.model("SavedInvestmentReport", SavedInvestmentReportSchema);
export default SavedInvestmentReportModal;
