import LoanRepaymentLogModal from "../modal/LoanRepaymentLogModal.js"
import { hrmsCatch } from "../utils/hrmsError.js";


export const getRepaymentLogsByLoan = async (req, res) => {
    try {
        const data = await LoanRepaymentLogModal.find({ loanId: req.params.loanId }).sort({ paymentDate: -1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Repayment logs by loan load failed", "The repayment logs by loan could not be loaded. Please try again.");
    }
}

export const getRepaymentLogsByEmployee = async (req, res) => {
    try {
        const data = await LoanRepaymentLogModal.find()
            .populate({ path: "loanId", match: { employeeId: req.params.empId }, select: "employeeId" })
        const filtered = data.filter(log => log.loanId !== null)
        res.status(200).send({ status: true, data: filtered })
    } catch (err) {
        return hrmsCatch(res, err, "Repayment logs load failed", "The repayment logs could not be loaded. Please try again.");
    }
}
