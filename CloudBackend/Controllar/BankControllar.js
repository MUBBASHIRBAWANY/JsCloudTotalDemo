import BankModal from "../modal/BankModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const createBank = async (req, res) => {
    try {
        const last = await BankModal.find().sort({ code: -1 }).limit(1)
        let nextCode
        if (last.length == 0) {
            nextCode = "001"
        } else {
            let nextNumber = parseInt(last[0].code, 10) + 1
            nextCode = nextNumber.toString().padStart(3, '0')
        }
        const data = await BankModal.create({ ...req.body, code: nextCode })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Bank save failed", "The bank could not be saved. Please try again.");
    }
}

export const getAllBank = async (req, res) => {
    try {
        const data = await BankModal.find()
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Bank list failed", "Banks could not be loaded. Please try again.");
    }
}

export const getBankById = async (req, res) => {
    try {
        const data = await BankModal.findById(req.params.id)
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Bank load failed", "The bank could not be loaded. Please try again.");
    }
}

export const updateBank = async (req, res) => {
    try {
        const data = await BankModal.findByIdAndUpdate(req.params.id, req.body, { new: true })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Bank update failed", "The bank could not be updated. Please try again.");
    }
}

export const deleteBank = async (req, res) => {
    try {
        await BankModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Bank delete failed", "The bank could not be deleted. Please try again.");
    }
}
