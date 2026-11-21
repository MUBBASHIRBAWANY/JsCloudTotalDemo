import ApprovalHistoryModal from "../Modal/ApprovalHistoryModal.js";
import { hrmsCatch } from "../utils/hrmsError.js";


export const logApprovalAction = async ({
    loanId,
    employeeId,
    workflowId,
    stepNumber,
    stepName,
    role,
    action,
    userId,
    previousAmount,
    updatedAmount,
    previousStatus,
    newStatus,
    remarks
}) => {
    try {
        const history = await ApprovalHistoryModal.create({
            loanId,
            employeeId,
            workflowId,
            stepNumber,
            stepName,
            role,
            action,
            userId,
            previousAmount,
            updatedAmount,
            previousStatus,
            newStatus,
            remarks,
            actionDate: new Date()
        });
        return history;
    } catch (err) {
        console.error("Failed to log approval action:", err);
        throw err;
    }
};

export const getHistoryByLoan = async (req, res) => {
    try {
        const history = await ApprovalHistoryModal.find({ loanId: req.params.loanId })
            .populate("userId", "firstName lastName")
            .sort({ actionDate: 1 });
        res.status(200).send({ status: true, data: history });
    } catch (err) {
        return hrmsCatch(res, err, "History by loan load failed", "The history by loan could not be loaded. Please try again.");
    }
};

export const getHistoryByEmployee = async (req, res) => {
    try {
        const history = await ApprovalHistoryModal.find({ employeeId: req.params.employeeId })
            .populate("userId", "firstName lastName")
            .populate("loanId", "loanNumber")
            .sort({ actionDate: -1 });
        res.status(200).send({ status: true, data: history });
    } catch (err) {
        return hrmsCatch(res, err, "History load failed", "The history could not be loaded. Please try again.");
    }
};
