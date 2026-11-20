import LoanModal from "../modal/LoanModal.js"
import LoanRepaymentLogModal from "../modal/LoanRepaymentLogModal.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const CreateLoan = async (req, res) => {
    try {
        const { employeeId, loanType, totalAmount, monthlyDeduction,  startDate, description } = req.body
        if (!employeeId || !totalAmount || !monthlyDeduction || !startDate) {
            return hrmsFail(res, 400, "Missing fields", "Employee, total amount, monthly deduction, and start date are required.")
        }

        // Generate amortization schedule
        const start = new Date(startDate)
        let remaining = totalAmount
        const schedule = []

        while (remaining > 0) {
            const deduct = Math.min(remaining, monthlyDeduction)
            schedule.push({
                month: start.getMonth() + 1,
                year: start.getFullYear(),
                amountToDeduct: deduct,
                status: "pending"
            })
            remaining = Math.round((remaining - deduct) * 100) / 100
            start.setMonth(start.getMonth() + 1)
        }

        const data = await LoanModal.create({
            employeeId, loanType, totalAmount, monthlyDeduction, startDate, description,
            remainingBalance: totalAmount,
            amortizationSchedule: schedule
        })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Loan save failed", "The loan could not be saved. Please try again.");
    }
}

export const getAllLoans = async (req, res) => {
    try {
        const query = {}
        if (req.query.status) query.status = req.query.status
        const data = await LoanModal.find(query).populate("employeeId", "firstName lastName code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Loans list failed", "Loans could not be loaded. Please try again.");
    }
}

export const getLoanById = async (req, res) => {
    try {
        const data = await LoanModal.findById(req.params.id)
            .populate("employeeId", "firstName lastName code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Loan load failed", "The loan could not be loaded. Please try again.");
    }
}

export const addRepayment = async (req, res) => {
    try {
        const { amount, paymentMethod, recordedBy, remarks } = req.body
        const loan = await LoanModal.findById(req.params.id)
        if (!loan) return hrmsFail(res, 404, "Loan not found", "No loan exists for this id.")

        loan.remainingBalance = Math.max(0, loan.remainingBalance - amount)

        // Mark the matching pending amortization entry as processed
        const now = new Date()
        const pendingEntry = loan.amortizationSchedule.find(
            s => s.status === "pending" && s.amountToDeduct <= amount
        )
        if (pendingEntry) {
            pendingEntry.status = "processed"
            pendingEntry.processedDate = now
        }

        if (loan.remainingBalance === 0) loan.status = "settled"
        await loan.save()

        await LoanRepaymentLogModal.create({
            loanId: loan._id,
            amount,
            paymentDate: now,
            paymentMethod: paymentMethod || "salary_deduction",
            recordedBy: recordedBy || "",
            remarks: remarks || ""
        })

        res.status(200).send({ status: true, data: loan })
    } catch (err) {
        return hrmsCatch(res, err, "Repayment save failed", "The repayment could not be saved. Please try again.");
    }
}

export const updateLoan = async (req, res) => {
    try {
        const data = await LoanModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Loan update failed", "The loan could not be updated. Please try again.");
    }
}

export const deleteLoan = async (req, res) => {
    try {
        await LoanModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Loan delete failed", "The loan could not be deleted. Please try again.");
    }
}

export const getActiveLoansByEmployee = async (req, res) => {
    try {
        const data = await LoanModal.find({ employeeId: req.params.empId, status: "active" })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Active loans load failed", "The active loans could not be loaded. Please try again.");
    }
}
