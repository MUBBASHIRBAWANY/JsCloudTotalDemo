import PayrollMonthModal from "../modal/PayrollMonthModal.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const closeMonth = async (req, res) => {
    try {
        const { month, year, closedBy } = req.body
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }
        const data = await PayrollMonthModal.findOneAndUpdate(
            { month: parseInt(month), year: parseInt(year) },
            { status: "closed", closedAt: new Date(), closedBy: closedBy || "" },
            { upsert: true, new: true }
        )
        res.status(200).send({ status: true, data, message: "Month closed successfully" })
    } catch (err) {
        return hrmsCatch(res, err, "Month update failed", "The month could not be updated. Please try again.");
    }
}

export const reopenMonth = async (req, res) => {
    try {
        const { month, year, reopenedBy } = req.body
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }
        const data = await PayrollMonthModal.findOneAndUpdate(
            { month: parseInt(month), year: parseInt(year) },
            { status: "open", reopenedAt: new Date(), reopenedBy: reopenedBy || "" },
            { new: true }
        )
        if (!data) {
            return hrmsFail(res, 404, "Payroll month not found", "No payroll month exists for this period.")
        }
        res.status(200).send({ status: true, data, message: "Month reopened successfully" })
    } catch (err) {
        return hrmsCatch(res, err, "Month update failed", "The month could not be updated. Please try again.");
    }
}

export const getMonthsList = async (req, res) => {
    try {
        const data = await PayrollMonthModal.find().sort({ year: -1, month: -1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Months list load failed", "The months list could not be loaded. Please try again.");
    }
}
