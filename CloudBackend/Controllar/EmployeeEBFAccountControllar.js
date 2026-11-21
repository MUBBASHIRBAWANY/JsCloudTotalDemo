import EmployeeEBFAccountModal from "../Modal/EmployeeEBFAccountModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const getAllEmployeeEBFAccounts = async (req, res) => {
    try {
        const data = await EmployeeEBFAccountModal.find().sort({ name: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Employee EBF accounts list failed", "Employee EBF accounts could not be loaded. Please try again.");
    }
}
