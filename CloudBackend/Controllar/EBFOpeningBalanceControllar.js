import EBFOpeningModal from "../modal/EBFOpeningModal.js";
import EmployeeEBFAccountModal from "../modal/EmployeeEBFAccountModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


async function attachEbfAccountIds(EmployeesData) {
    if (!Array.isArray(EmployeesData)) return EmployeesData;

    const accounts = await EmployeeEBFAccountModal.find();
    const byAccountId = new Map(accounts.map((acc) => [String(acc._id), acc]));
    const byEmpId = new Map(accounts.map((acc) => [String(acc.empId), acc]));

    return EmployeesData.map((row) => {
        const acc = byAccountId.get(String(row._id))
            || byEmpId.get(String(row.empId || row.employeeId));
        if (!acc) return row;
        return {
            ...row,
            _id: acc._id,
            empId: acc.empId,
            employeeId: acc.empId,
            employeeName: acc.name
        };
    });
}

export const createEBFOpening = async (req, res) => {
    try {
        const { DateStart, DateEnd, EmployeesData } = req.body;
        if (!DateStart || !DateEnd || !EmployeesData) {
            return hrmsFail(res, 400, "Missing fields", "Start date, end date, and employee rows are required.");
        }

        const data = await EBFOpeningModal.create({
            ...req.body,
            EmployeesData: await attachEbfAccountIds(EmployeesData),
            Status: req.body.Status || "false"
        });
        res.status(200).send({ status: true, message: "EBF Opening data added successfully" });
    } catch (err) {
        return hrmsCatch(res, err, "EBF opening save failed", "The EBF opening could not be saved. Please try again.");
    }
};

export const getAllEBFOpening = async (req, res) => {
    try {
        const EBFOpenings = await EBFOpeningModal.find();
        res.status(200).send({ status: true, data: EBFOpenings });
    } catch (err) {
        return hrmsCatch(res, err, "EBF opening list failed", "EBF openings could not be loaded. Please try again.");
    }
};

export const updateEBFOpening = async (req, res) => {
    const { id } = req.params;
    try {
        const payload = { ...req.body };
        if (payload.EmployeesData) {
            payload.EmployeesData = await attachEbfAccountIds(payload.EmployeesData);
        }
        const data = await EBFOpeningModal.findByIdAndUpdate(id, payload);
        res.status(200).send({ status: true, data: data });
    } catch (err) {
        return hrmsCatch(res, err, "EBF opening update failed", "The EBF opening could not be updated. Please try again.");
    }
};

export const deleteEBFOpening = async (req, res) => {
    const { id } = req.params;
    try {
        await EBFOpeningModal.findByIdAndDelete(id);
        res.status(200).send("EBF Opening data deleted successfully");
    } catch (err) {
        return hrmsCatch(res, err, "EBF opening delete failed", "The EBF opening could not be deleted. Please try again.");
    }
};