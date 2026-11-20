import ContractorModal from "../modal/ContractorModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const createContractor = async (req, res) => {
    try {
        const last = await ContractorModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await ContractorModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Contractor save failed", "The contractor could not be saved. Please try again.");
    }
}

export const getAllContractor = async (req, res) => {
    try {
        const data = await ContractorModal.find()
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Contractor list failed", "Contractors could not be loaded. Please try again.");
    }
}

export const getContractorById = async (req, res) => {
    try {
        const data = await ContractorModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Contractor load failed", "The contractor could not be loaded. Please try again.");
    }
}

export const updateContractor = async (req, res) => {
    try {
        const data = await ContractorModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Contractor update failed", "The contractor could not be updated. Please try again.");
    }
}

export const deleteContractor = async (req, res) => {
    try {
        await ContractorModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Contractor delete failed", "The contractor could not be deleted. Please try again.");
    }
}
