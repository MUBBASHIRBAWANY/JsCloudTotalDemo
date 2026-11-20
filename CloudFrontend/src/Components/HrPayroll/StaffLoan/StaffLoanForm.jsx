import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createLoan, getEBFBalance } from "../../../Api/StaffLoanApi";
import { getDataFundtion } from "../../../Api/CRUDFunctions";

const StaffLoanForm = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [ebfBalance, setEbfBalance] = useState(null);
    const [formData, setFormData] = useState({
        employeeId: "",
        requestedAmount: "",
        reason: "",
        supportingInfo: "",
        remarks: "",
        businessId: "",
        storeId: "",
        departmentId: ""
    });

    useEffect(() => {
        getDataFundtion("HrEmployee/getEmployeeNameId").then((res) => setEmployees(res.data || []));
    }, []);

    useEffect(() => {
        if (formData.employeeId) {
            fetchEBFBalance(formData.employeeId);
        }
    }, [formData.employeeId]);

    const fetchEBFBalance = async (employeeId) => {
        try {
            const response = await getEBFBalance(employeeId);
            if (response.status) {
                setEbfBalance(response.data.balance);
            }
        } catch (error) {
            console.error("Failed to fetch EBF balance:", error);
            setEbfBalance(null);
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
        setLoading(true);
        try {
            const response = await createLoan(formData);
            if (response.status) {
                navigate(`/StaffLoan/${response.data._id}`);
            }
        } catch (error) {
            console.error("Failed to create loan:", error);
            alert("Failed to create loan request");
        } finally {
            setLoading(false);
        }
    };

    const eligibilityAmount = ebfBalance ? ebfBalance * 0.5 : null;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Create Loan Request</h1>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Employee *
                    </label>
                    <select
                        name="employeeId"
                        value={formData.employeeId}
                        onChange={handleChange}
                        required
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select Employee</option>
                        {employees.map((emp) => (
                            <option key={emp._id} value={emp._id}>
                                {emp.firstName} {emp.lastName} ({emp.code})
                            </option>
                        ))}
                    </select>
                </div>

                {ebfBalance !== null && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <h3 className="text-sm font-medium text-blue-800 mb-2">Employee EBF Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Current EBF Balance</p>
                                <p className="text-lg font-semibold text-blue-900">{ebfBalance.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Eligible Amount (50%)</p>
                                <p className="text-lg font-semibold text-green-700">{eligibilityAmount?.toLocaleString() || "N/A"}</p>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">* Informational only - not enforced by system</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Requested Amount *
                    </label>
                    <input
                        type="number"
                        name="requestedAmount"
                        value={formData.requestedAmount}
                        onChange={handleChange}
                        required
                        min="1"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter amount"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason
                    </label>
                    <textarea
                        name="reason"
                        value={formData.reason}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter reason for loan"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Supporting Information
                    </label>
                    <textarea
                        name="supportingInfo"
                        value={formData.supportingInfo}
                        onChange={handleChange}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter supporting information"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Remarks
                    </label>
                    <textarea
                        name="remarks"
                        value={formData.remarks}
                        onChange={handleChange}
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter remarks"
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
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Create Loan Request"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default StaffLoanForm;
