import PayrollAdjustmentModal from "../Modal/PayrollAdjustmentModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const CreateAdjustment = async (req, res) => {
    try {
        const data = await PayrollAdjustmentModal.create({ ...req.body, createdAt: new Date().toISOString() })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Adjustment save failed", "The adjustment could not be saved. Please try again.");
    }
}

export const getAllAdjustments = async (req, res) => {
    try {
        const query = {}
        if (req.query.month) query.month = parseInt(req.query.month)
        if (req.query.year) query.year = parseInt(req.query.year)
        const data = await PayrollAdjustmentModal.find(query).populate("employeeId", "firstName lastName code")
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Adjustments list failed", "Adjustments could not be loaded. Please try again.");
    }
}

export const deleteAdjustment = async (req, res) => {
    try {
        await PayrollAdjustmentModal.findByIdAndDelete(req.params.id)
        res.status(200).send({ status: true, message: "Deleted" })
    } catch (err) {
        return hrmsCatch(res, err, "Adjustment delete failed", "The adjustment could not be deleted. Please try again.");
    }
}

export const getAdjustmentsByEmployee = async (req, res) => {
    try {
        const data = await PayrollAdjustmentModal.find({ employeeId: req.params.empId }).sort({ year: -1, month: -1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Adjustments load failed", "The adjustments could not be loaded. Please try again.");
    }
}
