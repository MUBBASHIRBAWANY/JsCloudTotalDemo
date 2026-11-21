import ReligionModal from "../Modal/ReligionModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const createReligion = async (req, res) => {
    try {
        const last = await ReligionModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await ReligionModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Religion save failed", "The religion could not be saved. Please try again.");
    }
}

export const getAllReligion = async (req, res) => {
    try {
        const data = await ReligionModal.find()
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Religion list failed", "Religions could not be loaded. Please try again.");
    }
}

export const getReligionById = async (req, res) => {
    try {
        const data = await ReligionModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Religion load failed", "The religion could not be loaded. Please try again.");
    }
}

export const updateReligion = async (req, res) => {
    try {
        const data = await ReligionModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Religion update failed", "The religion could not be updated. Please try again.");
    }
}

export const deleteReligion = async (req, res) => {
    try {
        await ReligionModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Religion delete failed", "The religion could not be deleted. Please try again.");
    }
}
