import LedgerEntryModal from "../modal/LedgerEntryModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const getEmployeeLedger = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { ledgerType } = req.query;
        
        const query = { employeeId };
        if (ledgerType) query.ledgerType = ledgerType;
        
        const entries = await LedgerEntryModal.find(query)
            .populate("payrollId", "month year")
            .populate("loanId", "loanNumber")
            .sort({ transactionDate: -1 });
        
        res.status(200).send({ status: true, data: entries });
    } catch (err) {
        return hrmsCatch(res, err, "Employee ledger load failed", "The employee ledger could not be loaded. Please try again.");
    }
};

export const getEBFLedger = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const entries = await LedgerEntryModal.find({ employeeId, ledgerType: "ebf" })
            .populate("payrollId", "month year")
            .sort({ transactionDate: -1 });
        
        res.status(200).send({ status: true, data: entries });
    } catch (err) {
        return hrmsCatch(res, err, "EBF ledger load failed", "The EBF ledger could not be loaded. Please try again.");
    }
};

export const getLoanLedger = async (req, res) => {
    try {
        const { employeeId } = req.params;
        
        const entries = await LedgerEntryModal.find({ employeeId, ledgerType: "loan" })
            .populate("loanId", "loanNumber")
            .sort({ transactionDate: -1 });
        
        res.status(200).send({ status: true, data: entries });
    } catch (err) {
        return hrmsCatch(res, err, "Loan ledger load failed", "The loan ledger could not be loaded. Please try again.");
    }
};

export const createLedgerEntry = async (req, res) => {
    try {
        const {
            ledgerType,
            employeeId,
            credit,
            debit,
            voucherNumber,
            transactionType,
            payrollId,
            loanId,
            businessId,
            storeId,
            departmentId,
            remarks
        } = req.body;
        
        // Get last closing balance
        const lastEntry = await LedgerEntryModal.findOne({ employeeId, ledgerType })
            .sort({ transactionDate: -1 });
        
        const openingBalance = lastEntry ? lastEntry.closingBalance : 0;
        const closingBalance = openingBalance + (credit || 0) - (debit || 0);
        
        const entry = await LedgerEntryModal.create({
            ledgerType,
            employeeId,
            openingBalance,
            credit: credit || 0,
            debit: debit || 0,
            closingBalance,
            voucherNumber,
            transactionType,
            payrollId,
            loanId,
            businessId,
            storeId,
            departmentId,
            createdBy: req.user?._id,
            transactionDate: new Date(),
            remarks
        });
        
        res.status(200).send({ status: true, data: entry });
    } catch (err) {
        return hrmsCatch(res, err, "Ledger entry save failed", "The ledger entry could not be saved. Please try again.");
    }
};

export const createReversal = async (req, res) => {
    try {
        const { id } = req.params;
        const { remarks } = req.body;
        
        const originalEntry = await LedgerEntryModal.findById(id);
        if (!originalEntry) {
            return hrmsFail(res, 404, "Ledger entry not found", "No ledger entry exists for this id.");
        }
        
        // Create reversal entry
        const reversalEntry = await LedgerEntryModal.create({
            ledgerType: originalEntry.ledgerType,
            employeeId: originalEntry.employeeId,
            openingBalance: originalEntry.closingBalance,
            credit: originalEntry.debit,
            debit: originalEntry.credit,
            closingBalance: originalEntry.openingBalance,
            voucherNumber: `REV-${originalEntry.voucherNumber}`,
            transactionType: `reversal_${originalEntry.transactionType}`,
            payrollId: originalEntry.payrollId,
            loanId: originalEntry.loanId,
            businessId: originalEntry.businessId,
            storeId: originalEntry.storeId,
            departmentId: originalEntry.departmentId,
            createdBy: req.user?._id,
            transactionDate: new Date(),
            remarks: remarks || `Reversal of ${originalEntry.voucherNumber}`,
            isReversal: true,
            reversalOf: originalEntry._id
        });
        
        res.status(200).send({ status: true, data: reversalEntry });
    } catch (err) {
        return hrmsCatch(res, err, "Reversal save failed", "The reversal could not be saved. Please try again.");
    }
};
