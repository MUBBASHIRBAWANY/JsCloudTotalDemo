import EmployeeLoanAccountModal from "../modal/EmployeeLoanAccountModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const getAllEmployeeLoanAccounts = async (req, res) => {
    try {
        const data = await EmployeeLoanAccountModal.find().sort({ name: 1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Employee loan accounts list failed", "Employee loan accounts could not be loaded. Please try again.");
    }
}
