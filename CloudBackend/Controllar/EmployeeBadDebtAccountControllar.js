import EmployeeBadDebtAccountModal from "../Modal/EmployeeBadDebtAccountModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const getAllEmployeeBadDebtAccounts = async (req, res) => {
    try {
        const data = await EmployeeBadDebtAccountModal.find().sort({ name: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Employee bad debt accounts list failed", "Employee bad debt accounts could not be loaded. Please try again.");
    }
}
