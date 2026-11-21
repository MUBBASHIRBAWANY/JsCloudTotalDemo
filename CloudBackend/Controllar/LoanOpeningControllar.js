    import LoanOpeningModal from "../Modal/LoanOpeningModal.js";
    import EmployeeLoanAccountModal from "../Modal/EmployeeLoanAccountModal.js";
    import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


    async function attachLoanAccountIds(EmployeesData) {
        if (!Array.isArray(EmployeesData)) return EmployeesData;

        const accounts = await EmployeeLoanAccountModal.find();
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

    export const createLoanOpening = async (req, res) => {
        try {
            const { DateStart, DateEnd, EmployeesData } = req.body;
            if (!DateStart || !DateEnd || !EmployeesData) {
                return hrmsFail(res, 400, "Missing fields", "Start date, end date, and employee rows are required.");
            }

            await LoanOpeningModal.create({
                ...req.body,
                EmployeesData: await attachLoanAccountIds(EmployeesData),
                Status: req.body.Status || "false"
            });
            res.status(200).send({ status: true, message: "Loan Opening data added successfully" });
        } catch (err) {
            return hrmsCatch(res, err, "Loan opening save failed", "The loan opening could not be saved. Please try again.");
        }
    };

    export const getAllLoanOpening = async (req, res) => {
        try {
            const data = await LoanOpeningModal.find();
            res.status(200).send({ status: true, data });
        } catch (err) {
            return hrmsCatch(res, err, "Loan opening list failed", "Loan openings could not be loaded. Please try again.");
        }
    };

    export const getLoanOpeningById = async (req, res) => {
        try {
            const data = await LoanOpeningModal.findById(req.params.id);
            res.status(200).send({ status: true, data });
        } catch (err) {
            return hrmsCatch(res, err, "Loan opening load failed", "The loan opening could not be loaded. Please try again.");
        }
    };

    export const updateLoanOpening = async (req, res) => {
        const { id } = req.params;
        try {
            const payload = { ...req.body };
            if (payload.EmployeesData) {
                payload.EmployeesData = await attachLoanAccountIds(payload.EmployeesData);
            }
            const data = await LoanOpeningModal.findByIdAndUpdate(id, payload);
            res.status(200).send({ status: true, data });
        } catch (err) {
            return hrmsCatch(res, err, "Loan opening update failed", "The loan opening could not be updated. Please try again.");
        }
    };

    export const deleteLoanOpening = async (req, res) => {
        const { id } = req.params;
        try {
            await LoanOpeningModal.findByIdAndDelete(id);
            res.status(200).send("Loan Opening data deleted successfully");
        } catch (err) {
            return hrmsCatch(res, err, "Loan opening delete failed", "The loan opening could not be deleted. Please try again.");
        }
    };
