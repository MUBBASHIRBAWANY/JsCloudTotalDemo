import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getLoanById, processPayment } from "../../../Api/StaffLoanApi";

const CashierPaymentForm = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loan, setLoan] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [formData, setFormData] = useState({
        paymentMethod: "bank",
        accountCode: "",
        accountName: "",
        narration: ""
    });

    useEffect(() => {
        fetchLoan();
    }, [id]);

    const fetchLoan = async () => {
        try {
            const response = await getLoanById(id);
            if (response.status) {
                setLoan(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch loan:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const response = await processPayment(id, formData);
            if (response.status) {
                navigate(`/StaffLoan/${id}`);
            }
        } catch (error) {
            console.error("Failed to process payment:", error);
            alert("Failed to process payment");
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return <div className="text-center py-8">Loading...</div>;
    }

    if (!loan) {
        return <div className="text-center py-8">Loan not found</div>;
    }

    const finalAmount = loan.bossApprovedAmount || loan.ceoApprovedAmount || loan.requestedAmount;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Process Payment</h1>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h2 className="text-lg font-semibold mb-4">Loan Summary</h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-sm text-gray-600">Loan Number</p>
                        <p className="font-medium">{loan.loanNumber}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Employee</p>
                        <p className="font-medium">{loan.employeeId?.firstName} {loan.employeeId?.lastName}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Department</p>
                        <p className="font-medium">{loan.employeeId?.department || "N/A"}</p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600">Final Amount</p>
                        <p className="text-xl font-bold text-green-600">{finalAmount?.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payment Method *
                    </label>
                    <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="cash">Cash Payment</option>
                        <option value="bank">Bank Payment</option>
                    </select>
                </div>

                {formData.paymentMethod === "bank" && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Account Code
                            </label>
                            <input
                                type="text"
                                name="accountCode"
                                value={formData.accountCode}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter account code"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Account Name
                            </label>
                            <input
                                type="text"
                                name="accountName"
                                value={formData.accountName}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter account name"
                            />
                        </div>
                    </>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Narration
                    </label>
                    <textarea
                        name="narration"
                        value={formData.narration}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter narration"
                    />
                </div>

                <div className="flex justify-end space-x-4">
                    <button
                        type="button"
                        onClick={() => navigate(-1)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                        {processing ? "Processing..." : "Process Payment"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CashierPaymentForm;
