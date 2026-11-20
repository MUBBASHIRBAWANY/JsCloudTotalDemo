import ReasonModal from "../modal/ReasonModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const createReason = async (req, res) => {
    try {
        const last = await ReasonModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await ReasonModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Reason save failed", "The reason could not be saved. Please try again.");
    }
}

export const getAllReason = async (req, res) => {
    try {
        const query = {}
        if (req.query.type) query.type = req.query.type
        const data = await ReasonModal.find(query)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Reason list failed", "Reasons could not be loaded. Please try again.");
    }
}

export const getReasonById = async (req, res) => {
    try {
        const data = await ReasonModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Reason load failed", "The reason could not be loaded. Please try again.");
    }
}

export const updateReason = async (req, res) => {
    try {
        const data = await ReasonModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Reason update failed", "The reason could not be updated. Please try again.");
    }
}

export const deleteReason = async (req, res) => {
    try {
        await ReasonModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Reason delete failed", "The reason could not be deleted. Please try again.");
    }
}
