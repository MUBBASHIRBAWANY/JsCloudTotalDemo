import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCashierPendingLoans } from "../../../Api/StaffLoanApi";

const CashierPaymentList = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPendingLoans();
    }, []);

    const fetchPendingLoans = async () => {
        try {
            const response = await getCashierPendingLoans();
            if (response.status) {
                setLoans(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch pending loans:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Pending Payments</h1>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : loans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No pending payments</div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Loan Number
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Employee
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Department
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Approved Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Approved By
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loans.map((loan) => (
                                <tr key={loan._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                                        {loan.loanNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {loan.employeeId?.firstName} {loan.employeeId?.lastName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {loan.employeeId?.department || "N/A"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap font-medium">
                                        {(loan.bossApprovedAmount || loan.ceoApprovedAmount || loan.requestedAmount)?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {loan.bossApprovedBy?.firstName} {loan.bossApprovedBy?.lastName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => navigate(`/StaffLoan/${loan._id}`)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => navigate(`/cashier-payment/${loan._id}`)}
                                            className="text-green-600 hover:text-green-900"
                                        >
                                            Process Payment
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default CashierPaymentList;
