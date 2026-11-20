import MonthlyTransactionModal from "../modal/MonthlyTransactionModal.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const createTransaction = async (req, res) => {
    try {
        const data = await MonthlyTransactionModal.create(req.body)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Transaction save failed", "The transaction could not be saved. Please try again.");
    }
}

export const getByEmployeeMonth = async (req, res) => {
    try {
        const { month, year } = req.query
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }
        const data = await MonthlyTransactionModal.find({
            employeeId: req.params.empId,
            month: parseInt(month),
            year: parseInt(year)
        })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "By employee month load failed", "The by employee month could not be loaded. Please try again.");
    }
}

export const getByMonth = async (req, res) => {
    try {
        const { month, year } = req.query
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }
        const data = await MonthlyTransactionModal.find({
            month: parseInt(month),
            year: parseInt(year)
        }).populate("employeeId", "firstName lastName code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "By month load failed", "The by month could not be loaded. Please try again.");
    }
}

export const updateTransaction = async (req, res) => {
    try {
        const data = await MonthlyTransactionModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Transaction update failed", "The transaction could not be updated. Please try again.");
    }
}

export const deleteTransaction = async (req, res) => {
    try {
        await MonthlyTransactionModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Transaction delete failed", "The transaction could not be deleted. Please try again.");
    }
}
