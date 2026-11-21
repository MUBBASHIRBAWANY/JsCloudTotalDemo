import SalaryHistoryModal from "../Modal/SalaryHistoryModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const CreateSalaryHistory = async (req, res) => {
    try {
        const data = await SalaryHistoryModal.create({ ...req.body, createdAt: new Date().toISOString() })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Salary history save failed", "The salary history could not be saved. Please try again.");
    }
}

export const getSalaryHistoryByEmployee = async (req, res) => {
    try {
        const data = await SalaryHistoryModal.find({ employeeId: req.params.empId }).sort({ effectiveDate: -1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Salary history load failed", "The salary history could not be loaded. Please try again.");
    }
}
