import AllowanceTypeModal from "../modal/AllowanceTypeModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const CreateAllowanceType = async (req, res) => {
    try {
        const last = await AllowanceTypeModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await AllowanceTypeModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Allowance type save failed", "The allowance type could not be saved. Please try again.");
    }
}

export const getAllAllowanceType = async (req, res) => {
    try {
        const data = await AllowanceTypeModal.find()
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Allowance type list failed", "Allowance types could not be loaded. Please try again.");
    }
}

export const getAllowanceTypeById = async (req, res) => {
    try {
        const data = await AllowanceTypeModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Allowance type load failed", "The allowance type could not be loaded. Please try again.");
    }
}

export const updateAllowanceType = async (req, res) => {
    try {
        const data = await AllowanceTypeModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Allowance type update failed", "The allowance type could not be updated. Please try again.");
    }
}

export const deleteAllowanceType = async (req, res) => {
    try {
        await AllowanceTypeModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Allowance type delete failed", "The allowance type could not be deleted. Please try again.");
    }
}

export const getAllowanceTypeNameId = async (req, res) => {
    try {
        const data = await AllowanceTypeModal.find({ active: true }, { name: 1, code: 1, defaultAmount: 1, type: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Allowance type load failed", "The allowance type could not be loaded. Please try again.");
    }
}
