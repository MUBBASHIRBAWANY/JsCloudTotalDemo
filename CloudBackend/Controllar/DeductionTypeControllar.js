import DeductionTypeModal from "../modal/DeductionTypeModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const CreateDeductionType = async (req, res) => {
    try {
        const last = await DeductionTypeModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await DeductionTypeModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Deduction type save failed", "The deduction type could not be saved. Please try again.");
    }
}

export const getAllDeductionType = async (req, res) => {
    try {
        const data = await DeductionTypeModal.find()
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Deduction type list failed", "Deduction types could not be loaded. Please try again.");
    }
}

export const getDeductionTypeById = async (req, res) => {
    try {
        const data = await DeductionTypeModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Deduction type load failed", "The deduction type could not be loaded. Please try again.");
    }
}

export const updateDeductionType = async (req, res) => {
    try {
        const data = await DeductionTypeModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Deduction type update failed", "The deduction type could not be updated. Please try again.");
    }
}

export const deleteDeductionType = async (req, res) => {
    try {
        await DeductionTypeModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Deduction type delete failed", "The deduction type could not be deleted. Please try again.");
    }
}

export const getDeductionTypeNameId = async (req, res) => {
    try {
        const data = await DeductionTypeModal.find({ active: true }, { name: 1, code: 1, defaultAmount: 1, type: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Deduction type load failed", "The deduction type could not be loaded. Please try again.");
    }
}
