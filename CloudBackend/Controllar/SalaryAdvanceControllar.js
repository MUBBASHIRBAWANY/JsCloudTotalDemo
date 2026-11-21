import SalaryAdvance from "../Modal/SalaryAdvanceModal.js";
import SalaryAdvanceRecovery from "../Modal/SalaryAdvanceRecoveryModal.js";
import ApprovalWorkflowModal from "../Modal/ApprovalWorkflowModal.js";
import { logApprovalAction } from "./ApprovalHistoryControllar.js";
import VoucherModal from "../Modal/VoucherModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


async function generateAdvanceNumber() {
    const year = new Date().getFullYear();
    const count = await SalaryAdvance.countDocuments({ advanceNumber: new RegExp(`^ADV-${year}`) });
    return `ADV-${year}-${String(count + 1).padStart(5, "0")}`;
}

// Salary Advance Workflow: Finance → Disbursement → Auto-deduct
function getStatusForStep(stepNumber) {
    const statusMap = {
        1: "pending_finance",
        2: "paid"
    };
    return statusMap[stepNumber] || "draft";
}

function getApproverFieldForStep(stepNumber) {
    const fieldMap = {
        1: "financeApprovedBy",
        2: "paidBy"
    };
    return fieldMap[stepNumber];
}

// Create Salary Advance Request (HR creates, goes to Finance)
export const createAdvance = async (req, res) => {
    try {
        const { employeeId, amount, paymentMethod, remarks, businessId, storeId, departmentId } = req.body;
        if (!employeeId || !amount) {
            return hrmsFail(res, 400, "Missing fields", "Employee and amount are required.");
        }

        // Get or create Salary Advance workflow
        let workflow = await ApprovalWorkflowModal.findOne({ module: "salary_advance", isActive: true });
        if (!workflow) {
            workflow = await ApprovalWorkflowModal.create({
                name: "Salary Advance Approval",
                module: "salary_advance",
                isActive: true,
                steps: [
                    { stepNumber: 1, name: "Finance Approval", role: "finance", permissions: { canApprove: true, canReject: true, canEditAmount: false, canEditRemarks: true } },
                    { stepNumber: 2, name: "Disbursement", role: "cashier", permissions: { canApprove: true, canReject: false, canEditAmount: false, canEditRemarks: true } }
                ]
            });
        }

        const advanceNumber = await generateAdvanceNumber();
        const advance = await SalaryAdvance.create({
            advanceNumber,
            employeeId,
            amount,
            workflowId: workflow._id,
            currentStep: 1,
            status: "pending_finance",
            paymentMethod: paymentMethod || "bank",
            remarks: remarks || "",
            businessId: businessId || null,
            storeId: storeId || null,
            departmentId: departmentId || null,
            requestedBy: req.user?._id,
            createdBy: req.user?._id
        });

        await logApprovalAction({
            loanId: advance._id,
            employeeId,
            workflowId: workflow._id,
            stepNumber: 0,
            stepName: "Request Created",
            role: "hr",
            action: "created",
            userId: req.user?._id,
            previousAmount: null,
            updatedAmount: amount,
            previousStatus: null,
            newStatus: "pending_finance",
            remarks: "Salary advance request created"
        });

        res.status(200).send({ status: true, data: advance });
    } catch (err) {
        return hrmsCatch(res, err, "Advance save failed", "The advance could not be saved. Please try again.");
    }
};

export const getAllAdvances = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.employeeId) query.employeeId = req.query.employeeId;

        const data = await SalaryAdvance.find(query)
            .populate("employeeId", "firstName lastName code")
            .populate("requestedBy", "firstName lastName")
            .populate("financeApprovedBy", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Advances list failed", "Advances could not be loaded. Please try again.");
    }
};

export const getAdvanceById = async (req, res) => {
    try {
        const advance = await SalaryAdvance.findById(req.params.id)
            .populate("employeeId", "firstName lastName code")
            .populate("requestedBy", "firstName lastName")
            .populate("financeApprovedBy", "firstName lastName")
            .populate("workflowId")
            .populate("voucherId");

        if (!advance) return hrmsFail(res, 404, "Salary advance not found", "No salary advance exists for this id.");

        const recoveries = await SalaryAdvanceRecovery.find({ advanceId: advance._id })
            .populate("payrollId", "month year")
            .sort({ year: 1, month: 1 });

        res.status(200).send({ status: true, data: { ...advance.toObject(), recoveries } });
    } catch (err) {
        return hrmsCatch(res, err, "Advance load failed", "The advance could not be loaded. Please try again.");
    }
};

// Approve advance (Finance approves)
export const approveAdvance = async (req, res) => {
    try {
        const { remarks } = req.body;
        const advance = await SalaryAdvance.findById(req.params.id);
        
        if (!advance) return hrmsFail(res, 404, "Salary advance not found", "No salary advance exists for this id.");
        if (["rejected", "cancelled", "paid", "recovered"].includes(advance.status)) {
            return hrmsFail(res, 400, "Advance not approvable", "This salary advance cannot be approved in its current state.");
        }

        const workflow = await ApprovalWorkflowModal.findById(advance.workflowId);
        if (!workflow) return hrmsFail(res, 404, "Approval workflow not found", "No approval workflow is configured for this request.");

        const currentStepConfig = workflow.steps.find(s => s.stepNumber === advance.currentStep);
        if (!currentStepConfig) return hrmsFail(res, 400, "Invalid value", "This approval step is not valid.");

        const previousStatus = advance.status;

        // Set approver
        const approverField = getApproverFieldForStep(advance.currentStep);
        advance[approverField] = req.user?._id;
        advance[`${approverField}At`] = new Date();

        // Move to next step
        const totalSteps = workflow.steps.length;
        if (advance.currentStep < totalSteps) {
            advance.currentStep += 1;
            advance.status = getStatusForStep(advance.currentStep);
        } else {
            advance.status = "paid";
        }

        await advance.save();

        await logApprovalAction({
            loanId: advance._id,
            employeeId: advance.employeeId,
            workflowId: advance.workflowId,
            stepNumber: advance.currentStep - 1,
            stepName: currentStepConfig.name,
            role: currentStepConfig.role,
            action: "approved",
            userId: req.user?._id,
            previousAmount: null,
            updatedAmount: advance.amount,
            previousStatus,
            newStatus: advance.status,
            remarks: remarks || ""
        });

        res.status(200).send({ status: true, data: advance });
    } catch (err) {
        return hrmsCatch(res, err, "Advance update failed", "The advance could not be updated. Please try again.");
    }
};

// Reject advance
export const rejectAdvance = async (req, res) => {
    try {
        const { remarks } = req.body;
        if (!remarks) {
            return hrmsFail(res, 400, "Missing fields", "A rejection reason is required.");
        }

        const advance = await SalaryAdvance.findById(req.params.id);
        if (!advance) return hrmsFail(res, 404, "Salary advance not found", "No salary advance exists for this id.");
        if (["rejected", "cancelled", "paid", "recovered"].includes(advance.status)) {
            return hrmsFail(res, 400, "Advance not rejectable", "This salary advance cannot be rejected in its current state.");
        }

        const workflow = await ApprovalWorkflowModal.findById(advance.workflowId);
        const currentStepConfig = workflow.steps.find(s => s.stepNumber === advance.currentStep);

        const previousStatus = advance.status;
        advance.status = "rejected";
        advance.rejectedAt = new Date();
        advance.rejectedBy = req.user?._id;
        advance.rejectionReason = remarks;

        await advance.save();

        await logApprovalAction({
            loanId: advance._id,
            employeeId: advance.employeeId,
            workflowId: advance.workflowId,
            stepNumber: advance.currentStep,
            stepName: currentStepConfig?.name || "Unknown",
            role: currentStepConfig?.role || "unknown",
            action: "rejected",
            userId: req.user?._id,
            previousAmount: null,
            updatedAmount: null,
            previousStatus,
            newStatus: "rejected",
            remarks
        });

        res.status(200).send({ status: true, data: advance });
    } catch (err) {
        return hrmsCatch(res, err, "Advance update failed", "The advance could not be updated. Please try again.");
    }
};

// Cancel advance
export const cancelAdvance = async (req, res) => {
    try {
        const { remarks } = req.body;
        const advance = await SalaryAdvance.findById(req.params.id);
        if (!advance) return hrmsFail(res, 404, "Salary advance not found", "No salary advance exists for this id.");
        
        if (advance.createdBy?.toString() !== req.user?._id?.toString()) {
            return hrmsFail(res, 403, "Cancel not allowed", "Only the person who created this request can cancel it.");
        }

        if (["paid", "recovered", "rejected", "cancelled"].includes(advance.status)) {
            return hrmsFail(res, 400, "Advance not cancellable", "This salary advance cannot be cancelled in its current state.");
        }

        const previousStatus = advance.status;
        advance.status = "cancelled";
        advance.cancelledAt = new Date();
        advance.cancelledBy = req.user?._id;
        advance.cancelReason = remarks || "Cancelled by creator";
        await advance.save();

        await logApprovalAction({
            loanId: advance._id,
            employeeId: advance.employeeId,
            workflowId: advance.workflowId,
            stepNumber: advance.currentStep,
            stepName: "Cancellation",
            role: "creator",
            action: "cancelled",
            userId: req.user?._id,
            previousAmount: null,
            updatedAmount: null,
            previousStatus,
            newStatus: "cancelled",
            remarks: remarks || "Cancelled by creator"
        });

        res.status(200).send({ status: true, data: advance });
    } catch (err) {
        return hrmsCatch(res, err, "Advance update failed", "The advance could not be updated. Please try again.");
    }
};

// Get pending approvals
export const getPendingApprovals = async (req, res) => {
    try {
        const pendingStatuses = ["pending_finance"];
        const data = await SalaryAdvance.find({ status: { $in: pendingStatuses } })
            .populate("employeeId", "firstName lastName code")
            .populate("requestedBy", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Pending approvals load failed", "The pending approvals could not be loaded. Please try again.");
    }
};

// Get cashier pending advances
export const getCashierPendingAdvances = async (req, res) => {
    try {
        const data = await SalaryAdvance.find({ status: "paid" })
            .populate("employeeId", "firstName lastName code department")
            .populate("financeApprovedBy", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Cashier pending advances load failed", "The cashier pending advances could not be loaded. Please try again.");
    }
};

// Process payment - creates voucher
export const processPayment = async (req, res) => {
    try {
        const { paymentMethod, accountCode, accountName, narration } = req.body;
        const advance = await SalaryAdvance.findById(req.params.id);
        
        if (!advance) return hrmsFail(res, 404, "Salary advance not found", "No salary advance exists for this id.");
        if (advance.status !== "paid") {
            return hrmsFail(res, 400, "Advance not payable", "This salary advance is not ready for payment.");
        }

        // Generate voucher
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const vPrefix = paymentMethod === "cash" ? "CP" : "BP";
        const vNum = `${vPrefix}${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

        const voucher = await VoucherModal.create({
            VoucherType: vPrefix,
            VoucherNumber: vNum,
            VoucherDate: dateStr,
            Ref: advance.advanceNumber,
            VoucharData: [
                {
                    AccountCode: accountCode || "",
                    AccountName: accountName || "Salary Advance Receivable",
                    Debit: String(advance.amount),
                    Credit: "0",
                    EmployeeReference: `${advance.employeeId}`,
                    Narration: narration || `Salary Advance - ${advance.advanceNumber}`
                },
                {
                    AccountCode: accountCode || "",
                    AccountName: accountName || "",
                    Debit: "0",
                    Credit: String(advance.amount),
                    Narration: narration || `Payment for ${advance.advanceNumber}`
                }
            ],
            TotalDebit: String(advance.amount),
            TotalCredit: String(advance.amount),
            Remarks: `Salary Advance Payment - ${advance.advanceNumber}`,
            ReferenceType: "SalaryAdvance",
            ReferenceId: advance._id,
            ReferenceNo: advance.advanceNumber
        });

        advance.voucherId = voucher._id;
        advance.voucherNumber = vNum;
        advance.paidAt = new Date();
        advance.paidBy = req.user?._id;
        await advance.save();

        await logApprovalAction({
            loanId: advance._id,
            employeeId: advance.employeeId,
            workflowId: advance.workflowId,
            stepNumber: 2,
            stepName: "Disbursement",
            role: "cashier",
            action: "approved",
            userId: req.user?._id,
            previousAmount: null,
            updatedAmount: advance.amount,
            previousStatus: "paid",
            newStatus: "paid",
            remarks: `Payment processed via ${paymentMethod}. Voucher: ${vNum}`
        });

        res.status(200).send({ status: true, data: { advance, voucher } });
    } catch (err) {
        return hrmsCatch(res, err, "Payment update failed", "The payment could not be updated. Please try again.");
    }
};

// Get active advances for payroll (auto-deduct same month)
export const getActiveAdvancesForPayroll = async (req, res) => {
    try {
        const advances = await SalaryAdvance.find({ status: "paid" })
            .populate("employeeId", "firstName lastName code");

        res.status(200).send({ status: true, data: advances });
    } catch (err) {
        return hrmsCatch(res, err, "Active advances for payroll load failed", "The active advances for payroll could not be loaded. Please try again.");
    }
};

// Get recovery history
export const getRecoveryHistory = async (req, res) => {
    try {
        const recoveries = await SalaryAdvanceRecovery.find({ advanceId: req.params.id })
            .populate("payrollId", "month year")
            .sort({ year: 1, month: 1 });

        res.status(200).send({ status: true, data: recoveries });
    } catch (err) {
        return hrmsCatch(res, err, "Recovery history load failed", "The recovery history could not be loaded. Please try again.");
    }
};
