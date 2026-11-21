import EmployeeAdvanceAccountModal from "../Modal/EmployeeAdvanceAccountModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const getAllEmployeeAdvanceAccounts = async (req, res) => {
    try {
        const data = await EmployeeAdvanceAccountModal.find().sort({ name: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Employee advance accounts list failed", "Employee advance accounts could not be loaded. Please try again.");
    }
}
