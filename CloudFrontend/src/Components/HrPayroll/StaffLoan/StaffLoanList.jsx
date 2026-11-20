import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllLoans, getPendingApprovals } from "../../../Api/StaffLoanApi";

const statusLabels = {
    draft: "Draft",
    pending_finance: "Pending Finance",
    pending_management: "Pending Management",
    pending_disbursement: "Pending Disbursement",
    active: "Active",
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

const StaffLoanList = () => {
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchLoans();
    }, [filter]);

    const fetchLoans = async () => {
        setLoading(true);
        try {
            let response;
            if (filter === "pending") {
                response = await getPendingApprovals();
            } else {
                const params = {};
                if (filter !== "all") params.status = filter;
                response = await getAllLoans(params);
            }
            if (response.status) {
                setLoans(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch loans:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredLoans = loans.filter((loan) => {
        const matchesSearch =
            loan.loanNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.employeeId?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            loan.employeeId?.lastName?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Staff Loans</h1>
                <button
                    onClick={() => navigate("/StaffLoanAdd")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                    New Loan Request
                </button>
            </div>

            <div className="flex space-x-4 mb-6">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="all">All Loans</option>
                    <option value="pending">Pending Approvals</option>
                    <option value="pending_finance">Pending Finance</option>
                    <option value="pending_management">Pending Management</option>
                    <option value="pending_disbursement">Pending Disbursement</option>
                    <option value="active">Active</option>
                    <option value="settled">Settled</option>
                    <option value="rejected">Rejected</option>
                </select>
                <input
                    type="text"
                    placeholder="Search by loan number or employee name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {loading ? (
                <div className="text-center py-8">Loading...</div>
            ) : filteredLoans.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No loans found</div>
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
                                    Requested Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLoans.map((loan) => (
                                <tr key={loan._id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-blue-600">
                                        {loan.loanNumber}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {loan.employeeId?.firstName} {loan.employeeId?.lastName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {loan.requestedAmount?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[loan.status]}`}>
                                            {statusLabels[loan.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(loan.loanDate).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => navigate(`/StaffLoan/${loan._id}`)}
                                            className="text-blue-600 hover:text-blue-900"
                                        >
                                            View
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

export default StaffLoanList;
