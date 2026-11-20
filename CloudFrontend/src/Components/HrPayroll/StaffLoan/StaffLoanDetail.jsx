import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLoanById, approveLoan, rejectLoan } from "../../../Api/StaffLoanApi";
import ApprovalHistoryTimeline from "./ApprovalHistoryTimeline";

const statusLabels = {
    draft: "Draft",
    pending_finance: "Pending Finance Approval",
    pending_management: "Pending Management Approval",
    pending_disbursement: "Pending Disbursement",
    active: "Active (Loan)",
    settled: "Settled",
    rejected: "Rejected",
    cancelled: "Cancelled"
};

const statusColors = {
    draft: "bg-gray-100 text-gray-800",
    pending_finance: "bg-yellow-100 text-yellow-800",
    pending_management: "bg-yellow-100 text-yellow-800",
    pending_disbursement: "bg-blue-100 text-blue-800",
    active: "bg-green-100 text-green-800",
    settled: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-800"
};

const StaffLoanDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [approvalAmount, setApprovalAmount] = useState("");
    const [remarks, setRemarks] = useState("");
    const [activeTab, setActiveTab] = useState("details");

    useEffect(() => {
        fetchLoan();
    }, [id]);

    const fetchLoan = async () => {
        try {
            const response = await getLoanById(id);
            if (response.status) {
                setLoan(response.data);
                setApprovalAmount(response.data.requestedAmount);
            }
        } catch (error) {
            console.error("Failed to fetch loan:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            const response = await approveLoan(id, {
                amount: Number(approvalAmount),
                remarks
            });
            if (response.status) {
                fetchLoan();
                setRemarks("");
            }
        } catch (error) {
            console.error("Failed to approve:", error);
            alert("Failed to approve loan");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        if (!remarks) {
            alert("Rejection reason is required");
            return;
        }
        setActionLoading(true);
        try {
            const response = await rejectLoan(id, { remarks });
            if (response.status) {
                fetchLoan();
                setRemarks("");
            }
        } catch (error) {
            console.error("Failed to reject:", error);
            alert("Failed to reject loan");
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (!loan) {
        return <div className="text-center py-8">Loan not found</div>;
    }

    const canApprove = ["pending_finance", "pending_management"].includes(loan.status);
    const isDisbursementPending = loan.status === "pending_disbursement";
    const isActive = loan.status === "active";

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h1 className="text-2xl font-bold">{loan.loanNumber}</h1>
                    <p className="text-gray-600">{loan.employeeId?.firstName} {loan.employeeId?.lastName}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[loan.status]}`}>
                    {statusLabels[loan.status]}
                </span>
            </div>

            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab("details")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === "details"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Details
                    </button>
                    <button
                        onClick={() => setActiveTab("history")}
                        className={`py-2 px-1 border-b-2 font-medium text-sm ${
                            activeTab === "history"
                                ? "border-blue-500 text-blue-600"
                                : "border-transparent text-gray-500 hover:text-gray-700"
                        }`}
                    >
                        Approval History
                    </button>
                </nav>
            </div>

            {activeTab === "details" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">Amount Information</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Requested Amount</span>
                                <span className="font-medium">{loan.requestedAmount?.toLocaleString()}</span>
                            </div>
                            {loan.hrApprovedAmount && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">HR Approved</span>
                                    <span className="font-medium">{loan.hrApprovedAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {loan.financeApprovedAmount && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Finance Approved</span>
                                    <span className="font-medium">{loan.financeApprovedAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {loan.bossApprovedAmount && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Management Approved</span>
                                    <span className="font-medium">{loan.bossApprovedAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {loan.paidAmount && (
                                <div className="flex justify-between border-t pt-3">
                                    <span className="text-gray-900 font-semibold">Disbursed Amount</span>
                                    <span className="font-bold text-green-600">{loan.paidAmount.toLocaleString()}</span>
                                </div>
                            )}
                            {loan.monthlyInstallment > 0 && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Monthly Installment</span>
                                        <span className="font-medium">{loan.monthlyInstallment.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Outstanding Balance</span>
                                        <span className="font-medium text-orange-600">{loan.outstandingBalance?.toLocaleString()}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-4">Request Information</h2>
                        <div className="space-y-3">
                            <div>
                                <span className="text-gray-600">Reason</span>
                                <p className="mt-1">{loan.reason || "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Supporting Info</span>
                                <p className="mt-1">{loan.supportingInfo || "N/A"}</p>
                            </div>
                            <div>
                                <span className="text-gray-600">Remarks</span>
                                <p className="mt-1">{loan.remarks || "N/A"}</p>
                            </div>
                        </div>
                    </div>

                    {canApprove && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 lg:col-span-2">
                            <h2 className="text-lg font-semibold mb-4">Approval Action</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Approval Amount
                                    </label>
                                    <input
                                        type="number"
                                        value={approvalAmount}
                                        onChange={(e) => setApprovalAmount(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Remarks
                                    </label>
                                    <textarea
                                        value={remarks}
                                        onChange={(e) => setRemarks(e.target.value)}
                                        rows={2}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter remarks"
                                    />
                                </div>
                                <div className="flex space-x-4">
                                    <button
                                        onClick={handleApprove}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {actionLoading ? "Processing..." : "Approve"}
                                    </button>
                                    <button
                                        onClick={handleReject}
                                        disabled={actionLoading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {actionLoading ? "Processing..." : "Reject"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {(isActive || isDisbursementPending) && (
                        <div className="bg-white border border-gray-200 rounded-lg p-6 lg:col-span-2">
                            <h2 className="text-lg font-semibold mb-4">Disbursement Information</h2>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-gray-600">Payment Method</span>
                                    <p className="mt-1 font-medium">{loan.paymentMethod?.toUpperCase()}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Voucher Number</span>
                                    <p className="mt-1 font-medium">{loan.voucherNumber || "N/A"}</p>
                                </div>
                                <div>
                                    <span className="text-gray-600">Disbursed At</span>
                                    <p className="mt-1">{loan.paidAt ? new Date(loan.paidAt).toLocaleString() : "N/A"}</p>
                                </div>
                                {isActive && (
                                    <div>
                                        <span className="text-gray-600">Outstanding Balance</span>
                                        <p className="mt-1 font-medium text-orange-600">{loan.outstandingBalance?.toLocaleString()}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === "history" && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <ApprovalHistoryTimeline loanId={loan._id} />
                </div>
            )}
        </div>
    );
};

export default StaffLoanDetail;
