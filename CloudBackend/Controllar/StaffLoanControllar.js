import StaffLoan from "../modal/StaffLoanModal.js";
import ApprovalWorkflowModal from "../modal/ApprovalWorkflowModal.js";
import { logApprovalAction } from "./ApprovalHistoryControllar.js";
import EBFBalanceModal from "../modal/EBFBalanceModal.js";
import VoucherModal from "../modal/VoucherModal.js";
import { hrmsCatch, hrmsFail } from "../utils/hrmsError.js";


async function generateLoanNumber() {
    const year = new Date().getFullYear();
    const count = await StaffLoan.countDocuments({ loanNumber: new RegExp(`^LOAN-${year}`) });
    return `LOAN-${year}-${String(count + 1).padStart(3, "0")}`;
}

// Employee Loan Workflow: Finance → Boss → Disbursement
function getStatusForStep(stepNumber) {
    const statusMap = {
        1: "pending_finance",
        2: "pending_management",
        3: "pending_disbursement"
    };
    return statusMap[stepNumber] || "draft";
}

function getAmountFieldForStep(stepNumber) {
    const fieldMap = {
        1: "financeApprovedAmount",
        2: "bossApprovedAmount",
        3: "paidAmount"
    };
    return fieldMap[stepNumber];
}

function getApproverFieldForStep(stepNumber) {
    const fieldMap = {
        1: "financeApprovedBy",
        2: "bossApprovedBy",
        3: "paidBy"
    };
    return fieldMap[stepNumber];
}

// Create Employee Loan Request (HR creates, goes to Finance)
export const createLoan = async (req, res) => {
    try {
        const { employeeId, requestedAmount, installmentCount, reason, supportingInfo, remarks, businessId, storeId, departmentId } = req.body;
        
        if (!employeeId || !requestedAmount) {
            return hrmsFail(res, 400, "Missing fields", "Employee and requested amount are required.");
        }

        // Get or create Employee Loan workflow
        let workflow = await ApprovalWorkflowModal.findOne({ module: "employee_loan", isActive: true });
        if (!workflow) {
            workflow = await ApprovalWorkflowModal.create({
                name: "Employee Loan Approval",
                module: "employee_loan",
                isActive: true,
                steps: [
                    { stepNumber: 1, name: "Finance Approval", role: "finance", permissions: { canApprove: true, canReject: true, canEditAmount: true, canEditRemarks: true } },
                    { stepNumber: 2, name: "Management Approval", role: "boss", permissions: { canApprove: true, canReject: true, canEditAmount: true, canEditRemarks: true } },
                    { stepNumber: 3, name: "Disbursement", role: "cashier", permissions: { canApprove: true, canReject: false, canEditAmount: false, canEditRemarks: true } }
                ]
            });
        }

        const loanNumber = await generateLoanNumber();
        const installments = installmentCount || 12;
        const monthlyInstallment = Math.ceil(requestedAmount / installments);

        const loan = await StaffLoan.create({
            loanNumber,
            employeeId,
            requestedAmount,
            monthlyInstallment,
            installmentCount: installments,
            outstandingBalance: requestedAmount,
            workflowId: workflow._id,
            currentStep: 1,
            status: "pending_finance",
            reason: reason || "",
            supportingInfo: supportingInfo || "",
            remarks: remarks || "",
            businessId: businessId || null,
            storeId: storeId || null,
            departmentId: departmentId || null,
            requestedBy: req.user?._id,
            createdBy: req.user?._id
        });

        await logApprovalAction({
            loanId: loan._id,
            employeeId,
            workflowId: workflow._id,
            stepNumber: 0,
            stepName: "Request Created",
            role: "hr",
            action: "created",
            userId: req.user?._id,
            previousAmount: null,
            updatedAmount: requestedAmount,
            previousStatus: null,
            newStatus: "pending_finance",
            remarks: "Loan request created"
        });

        res.status(200).send({ status: true, data: loan });
    } catch (err) {
        return hrmsCatch(res, err, "Loan save failed", "The loan could not be saved. Please try again.");
    }
};

export const getAllLoans = async (req, res) => {
    try {
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.employeeId) query.employeeId = req.query.employeeId;

        const data = await StaffLoan.find(query)
            .populate("employeeId", "firstName lastName code")
            .populate("requestedBy", "firstName lastName")
            .populate("financeApprovedBy", "firstName lastName")
            .populate("bossApprovedBy", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Loans list failed", "Loans could not be loaded. Please try again.");
    }
};

export const getLoanById = async (req, res) => {
    try {
        const loan = await StaffLoan.findById(req.params.id)
            .populate("employeeId", "firstName lastName code")
            .populate("requestedBy", "firstName lastName")
            .populate("financeApprovedBy", "firstName lastName")
            .populate("bossApprovedBy", "firstName lastName")
            .populate("workflowId")
            .populate("voucherId");

        if (!loan) return hrmsFail(res, 404, "Staff loan not found", "No staff loan exists for this id.");

        res.status(200).send({ status: true, data: loan });
    } catch (err) {
        return hrmsCatch(res, err, "Loan load failed", "The loan could not be loaded. Please try again.");
    }
};

export const approveLoan = async (req, res) => {
    try {
        const { amount, remarks } = req.body;
        const loan = await StaffLoan.findById(req.params.id);
        
        if (!loan) return hrmsFail(res, 404, "Staff loan not found", "No staff loan exists for this id.");
        if (["rejected", "cancelled", "active", "settled"].includes(loan.status)) {
            return hrmsFail(res, 400, "Loan not approvable", "This loan cannot be approved in its current state.");
        }

        const workflow = await ApprovalWorkflowModal.findById(loan.workflowId);
        if (!workflow) return hrmsFail(res, 404, "Approval workflow not found", "No approval workflow is configured for this request.");

        const currentStepConfig = workflow.steps.find(s => s.stepNumber === loan.currentStep);
        if (!currentStepConfig) return hrmsFail(res, 400, "Invalid value", "This approval step is not valid.");

        const previousAmount = loan[getAmountFieldForStep(loan.currentStep)] || loan.requestedAmount;
        const previousStatus = loan.status;

        const amountField = getAmountFieldForStep(loan.currentStep);
        if (amount !== undefined) {
            loan[amountField] = amount;
        } else {
            loan[amountField] = previousAmount;
        }

        const approverField = getApproverFieldForStep(loan.currentStep);
        loan[approverField] = req.user?._id;
        loan[`${approverField}At`] = new Date();

        const totalSteps = workflow.steps.length;
        if (loan.currentStep < totalSteps) {
            loan.currentStep += 1;
            loan.status = getStatusForStep(loan.currentStep);
        } else {
            // Final step - loan is approved, ready for disbursement
            loan.status = "pending_disbursement";
        }

        await loan.save();

        await logApprovalAction({
            loanId: loan._id,
            employeeId: loan.employeeId,
            workflowId: loan.workflowId,
            stepNumber: loan.currentStep - 1,
            stepName: currentStepConfig.name,
            role: currentStepConfig.role,
            action: "approved",
            userId: req.user?._id,
            previousAmount,
            updatedAmount: loan[amountField],
            previousStatus,
            newStatus: loan.status,
            remarks: remarks || ""
        });

        res.status(200).send({ status: true, data: loan });
    } catch (err) {
        return hrmsCatch(res, err, "Loan update failed", "The loan could not be updated. Please try again.");
    }
};

export const rejectLoan = async (req, res) => {
    try {
        const { remarks } = req.body;
        if (!remarks) {
            return hrmsFail(res, 400, "Missing fields", "A rejection reason is required.");
        }

        const loan = await StaffLoan.findById(req.params.id);
        if (!loan) return hrmsFail(res, 404, "Staff loan not found", "No staff loan exists for this id.");
        if (["rejected", "cancelled", "active", "settled"].includes(loan.status)) {
            return hrmsFail(res, 400, "Loan not rejectable", "This loan cannot be rejected in its current state.");
        }

        const workflow = await ApprovalWorkflowModal.findById(loan.workflowId);
        const currentStepConfig = workflow.steps.find(s => s.stepNumber === loan.currentStep);

        const previousStatus = loan.status;
        loan.status = "rejected";
        loan.rejectedAt = new Date();
        loan.rejectedBy = req.user?._id;
        loan.rejectionReason = remarks;

        await loan.save();

        await logApprovalAction({
            loanId: loan._id,
            employeeId: loan.employeeId,
            workflowId: loan.workflowId,
            stepNumber: loan.currentStep,
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

        res.status(200).send({ status: true, data: loan });
    } catch (err) {
        return hrmsCatch(res, err, "Loan update failed", "The loan could not be updated. Please try again.");
    }
};

export const cancelLoan = async (req, res) => {
    try {
        const { remarks } = req.body;
        const loan = await StaffLoan.findById(req.params.id);
        if (!loan) return hrmsFail(res, 404, "Staff loan not found", "No staff loan exists for this id.");
        
        if (loan.createdBy?.toString() !== req.user?._id?.toString()) {
            return hrmsFail(res, 403, "Cancel not allowed", "Only the person who created this request can cancel it.");
        }

        if (["active", "settled", "rejected", "cancelled"].includes(loan.status)) {
            return hrmsFail(res, 400, "Loan not cancellable", "This loan cannot be cancelled in its current state.");
        }

        const previousStatus = loan.status;
        loan.status = "cancelled";
        loan.closedAt = new Date();
        await loan.save();

        await logApprovalAction({
            loanId: loan._id,
            employeeId: loan.employeeId,
            workflowId: loan.workflowId,
            stepNumber: loan.currentStep,
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

        res.status(200).send({ status: true, data: loan });
    } catch (err) {
        return hrmsCatch(res, err, "Loan update failed", "The loan could not be updated. Please try again.");
    }
};

export const getPendingApprovals = async (req, res) => {
    try {
        const pendingStatuses = ["pending_finance", "pending_management", "pending_disbursement"];
        const data = await StaffLoan.find({ status: { $in: pendingStatuses } })
            .populate("employeeId", "firstName lastName code")
            .populate("requestedBy", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Pending approvals load failed", "The pending approvals could not be loaded. Please try again.");
    }
};

export const getEBFBalance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        let ebf = await EBFBalanceModal.findOne({ employeeId });
        if (!ebf) {
            ebf = { employeeId, balance: 0 };
        }
        res.status(200).send({ status: true, data: ebf });
    } catch (err) {
        return hrmsCatch(res, err, "EBF balance load failed", "The EBF balance could not be loaded. Please try again.");
    }
};

export const getDisbursementPendingLoans = async (req, res) => {
    try {
        const data = await StaffLoan.find({ status: "pending_disbursement" })
            .populate("employeeId", "firstName lastName code department")
            .populate("bossApprovedBy", "firstName lastName")
            .sort({ createdAt: -1 });

        res.status(200).send({ status: true, data });
    } catch (err) {
        return hrmsCatch(res, err, "Disbursement pending loans load failed", "The disbursement pending loans could not be loaded. Please try again.");
    }
};

// Disburse loan - creates voucher and activates loan
export const disburseLoan = async (req, res) => {
    try {
        const { paymentMethod, accountCode, accountName, narration } = req.body;
        const loan = await StaffLoan.findById(req.params.id);
        
        if (!loan) return hrmsFail(res, 404, "Staff loan not found", "No staff loan exists for this id.");
        if (loan.status !== "pending_disbursement") {
            return hrmsFail(res, 400, "Loan not disbursable", "This loan is not ready for disbursement.");
        }

        const finalAmount = loan.bossApprovedAmount || loan.financeApprovedAmount || loan.requestedAmount;

        // Generate voucher
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
        const vPrefix = paymentMethod === "cash" ? "CP" : "BP";
        const vNum = `${vPrefix}${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(Math.floor(Math.random() * 10000)).padStart(4, "0")}`;

        const voucher = await VoucherModal.create({
            VoucherType: vPrefix,
            VoucherNumber: vNum,
            VoucherDate: dateStr,
            Ref: loan.loanNumber,
            VoucharData: [
                {
                    AccountCode: accountCode || "",
                    AccountName: accountName || "Employee Loan Receivable",
                    Debit: String(finalAmount),
                    Credit: "0",
                    EmployeeReference: `${loan.employeeId}`,
                    Narration: narration || `Employee Loan Disbursement - ${loan.loanNumber}`
                },
                {
                    AccountCode: accountCode || "",
                    AccountName: accountName || "",
                    Debit: "0",
                    Credit: String(finalAmount),
                    Narration: narration || `Payment for ${loan.loanNumber}`
                }
            ],
            TotalDebit: String(finalAmount),
            TotalCredit: String(finalAmount),
            Remarks: `Employee Loan Disbursement - ${loan.loanNumber}`,
            ReferenceType: "StaffLoan",
            ReferenceId: loan._id,
            ReferenceNo: loan.loanNumber
        });

        // Update loan
        loan.paymentMethod = paymentMethod;
        loan.voucherId = voucher._id;
        loan.voucherNumber = vNum;
        loan.paidAmount = finalAmount;
        loan.paidAt = new Date();
        loan.status = "active";
        loan.outstandingBalance = finalAmount;
        await loan.save();

        await logApprovalAction({
            loanId: loan._id,
            employeeId: loan.employeeId,
            workflowId: loan.workflowId,
            stepNumber: 3,
            stepName: "Disbursement",
            role: "cashier",
            action: "approved",
            userId: req.user?._id,
            previousAmount: loan.bossApprovedAmount,
            updatedAmount: finalAmount,
            previousStatus: "pending_disbursement",
            newStatus: "active",
            remarks: `Loan disbursed via ${paymentMethod}. Voucher: ${vNum}`
        });

        res.status(200).send({ status: true, data: { loan, voucher } });
    } catch (err) {
        return hrmsCatch(res, err, "Loan update failed", "The loan could not be updated. Please try again.");
    }
};

// Get active loans for payroll recovery
export const getActiveLoansForPayroll = async (req, res) => {
    try {
        const loans = await StaffLoan.find({ status: "active", outstandingBalance: { $gt: 0 } })
            .populate("employeeId", "firstName lastName code");

        res.status(200).send({ status: true, data: loans });
    } catch (err) {
        return hrmsCatch(res, err, "Active loans for payroll load failed", "The active loans for payroll could not be loaded. Please try again.");
    }
};
