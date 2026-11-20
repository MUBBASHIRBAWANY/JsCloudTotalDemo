import PayrollModal from "../modal/PayrollModal.js"
import EmployeeHrModal from "../modal/EmployeeHrModal.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const getTaxChallan = async (req, res) => {
    try {
        const { month, year } = req.query
        if (!month || !year) {
            return hrmsFail(res, 400, "Missing fields", "Month and year are required.")
        }

        const payrolls = await PayrollModal.find({
            month: parseInt(month),
            year: parseInt(year)
        }).populate("employeeId", "firstName lastName code taxInfo")

        // Tax calculation placeholder — tax deducted is 0 until tax slabs are configured
        const challan = payrolls.map(p => ({
            employeeId: p.employeeId?._id,
            name: p.employeeId ? `${p.employeeId.firstName} ${p.employeeId.lastName}` : "",
            code: p.employeeId?.code || "",
            ntuNumber: p.employeeId?.taxInfo?.ntuNumber || "",
            grossSalary: p.grossSalary,
            netSalary: p.netSalary,
            taxDeducted: 0, // placeholder — requires tax slab configuration
            month: p.month,
            year: p.year
        }))

        res.status(200).send({ status: true, data: challan })
    } catch (err) {
        return hrmsCatch(res, err, "Tax challan load failed", "The tax challan could not be loaded. Please try again.");
    }
}
