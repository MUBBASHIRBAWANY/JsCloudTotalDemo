import EarningDeductionCodeModal from "../modal/EarningDeductionCodeModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const createEarningDeductionCode = async (req, res) => {
    try {
        const last = await EarningDeductionCodeModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await EarningDeductionCodeModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Earning deduction code save failed", "The earning deduction code could not be saved. Please try again.");
    }
}

export const getAllEarningDeductionCode = async (req, res) => {
    try {
        const query = {}
        if (req.query.type) query.type = req.query.type
        const data = await EarningDeductionCodeModal.find(query)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Earning deduction code list failed", "Earning deduction codes could not be loaded. Please try again.");
    }
}

export const getEarningDeductionCodeById = async (req, res) => {
    try {
        const data = await EarningDeductionCodeModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Earning deduction code load failed", "The earning deduction code could not be loaded. Please try again.");
    }
}

export const updateEarningDeductionCode = async (req, res) => {
    try {
        const data = await EarningDeductionCodeModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Earning deduction code update failed", "The earning deduction code could not be updated. Please try again.");
    }
}

export const deleteEarningDeductionCode = async (req, res) => {
    try {
        await EarningDeductionCodeModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Earning deduction code delete failed", "The earning deduction code could not be deleted. Please try again.");
    }
}

export const getActiveEarningDeductionCode = async (req, res) => {
    try {
        const query = { active: true }
        if (req.query.type) query.type = req.query.type
        const data = await EarningDeductionCodeModal.find(query)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Active earning deduction code load failed", "The active earning deduction code could not be loaded. Please try again.");
    }
}
