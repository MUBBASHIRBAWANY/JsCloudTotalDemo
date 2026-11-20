import mongoose from "mongoose";

const AccountEntrySchema = new mongoose.Schema({
    code: { type: String, default: "" },
    name: { type: String, default: "" }
}, { _id: false });

const PayrollAccountMappingSchema = new mongoose.Schema({
    // 1. Salary Expense - DEBIT total gross salary
    salaryExpense: { type: AccountEntrySchema, default: () => ({}) },
    
    // 2. Salary Payable - CREDIT net salary payable
    salaryPayable: { type: AccountEntrySchema, default: () => ({}) },
    
    // 3. Employee Benefit Fund (Employee) - CREDIT employee EBF contribution
    ebfEmployee: { type: AccountEntrySchema, default: () => ({}) },
    
    // 4. Employee Benefit Fund (Company Contribution) - DEBIT employer EBF contribution
    ebfCompany: { type: AccountEntrySchema, default: () => ({}) },
    
    // 5. Employee Loan - CREDIT loan recovery
    employeeLoan: { type: AccountEntrySchema, default: () => ({}) },
    
    // 6. Salary Advance - CREDIT advance recovery
    salaryAdvance: { type: AccountEntrySchema, default: () => ({}) },
    
    // 7. Employee Benefit Expense (Company) - DEBIT employer contributions
    ebfExpense: { type: AccountEntrySchema, default: () => ({}) }
}, { timestamps: true });

const PayrollAccountMapping = mongoose.model("HrPayrollAccountMapping", PayrollAccountMappingSchema);

export default PayrollAccountMapping;
