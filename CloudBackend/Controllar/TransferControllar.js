import TransferHistoryModal from "../Modal/TransferHistoryModal.js"
import EmployeeHrModal from "../Modal/EmployeeHrModal.js"
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


export const transferEmployee = async (req, res) => {
    try {
        const { employeeId, toDepartmentId, transferDate, reason, transferredBy } = req.body
        if (!employeeId || !toDepartmentId || !transferDate) {
            return hrmsFail(res, 400, "Missing fields", "Employee, destination department, and transfer date are required.")
        }

        const employee = await EmployeeHrModal.findById(employeeId)
        if (!employee) {
            return hrmsFail(res, 404, "Employee not found", "No employee exists for this id.")
        }

        const transferRecord = await TransferHistoryModal.create({
            employeeId,
            fromDepartmentId: employee.departmentId,
            toDepartmentId,
            transferDate,
            reason: reason || "",
            transferredBy: transferredBy || ""
        })

        await EmployeeHrModal.findByIdAndUpdate(employeeId, { departmentId: toDepartmentId })

        res.status(200).send({ status: true, data: transferRecord, message: "Employee transferred successfully" })
    } catch (err) {
        return hrmsCatch(res, err, "Transfer employee failed", "The transfer employee could not be completed. Please try again.");
    }
}

export const getTransferHistory = async (req, res) => {
    try {
        const data = await TransferHistoryModal.find({ employeeId: req.params.empId })
            .populate("employeeId", "firstName lastName code")
            .populate("fromDepartmentId", "name code")
            .populate("toDepartmentId", "name code")
            .sort({ transferDate: -1 })
        res.status(200).send({ status: true, data })
    } catch (err) {
        return hrmsCatch(res, err, "Transfer history load failed", "The transfer history could not be loaded. Please try again.");
    }
}
