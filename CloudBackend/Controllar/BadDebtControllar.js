import BadDebtModal from "../Modal/BadDebtModal.js";
import EmployeeBadDebtAccountModal from "../Modal/EmployeeBadDebtAccountModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


async function attachBadDebtAccountIds(EmployeesData) {
    if (!Array.isArray(EmployeesData)) return EmployeesData;

    const accounts = await EmployeeBadDebtAccountModal.find();
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

export const createBadDebt = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.EmployeesData) {
            payload.EmployeesData = await attachBadDebtAccountIds(payload.EmployeesData);
        }
        const data = await BadDebtModal.create(payload);
        res.status(200).send("Bad Debt data added successfully");
    } catch (e) {
        console.log(e);
        res.status(400).send("Server Error");
    }
};

export const getAllBadDebt = async (req, res) => {
    try {
        const data = await BadDebtModal.find();
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Bad debt list failed", "Bad debts could not be loaded. Please try again.");
    }
};

export const getBadDebtById = async (req, res) => {
    try {
        const data = await BadDebtModal.findById(req.params.id);
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Bad debt load failed", "The bad debt could not be loaded. Please try again.");
    }
};

export const updateBadDebt = async (req, res) => {
    try {
        const payload = { ...req.body };
        if (payload.EmployeesData) {
            payload.EmployeesData = await attachBadDebtAccountIds(payload.EmployeesData);
        }
        const data = await BadDebtModal.findByIdAndUpdate(req.params.id, payload, { new: true });
        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Bad debt update failed", "The bad debt could not be updated. Please try again.");
    }
};

export const deleteBadDebt = async (req, res) => {
    try {
        await BadDebtModal.findByIdAndDelete(req.params.id);
        res.status(200).send("Bad Debt data deleted successfully");
    } catch (err) {
        return hrmsCatch(res, err, "Bad debt delete failed", "The bad debt could not be deleted. Please try again.");
    }
};
