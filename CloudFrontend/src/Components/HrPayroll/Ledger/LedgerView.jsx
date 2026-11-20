import React, { useEffect, useState } from "react";
import { getEmployeeLedger } from "../../../Api/LedgerApi";

const LedgerView = ({ employeeId }) => {
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");

    useEffect(() => {
        if (employeeId) fetchLedger();
    }, [employeeId, filter]);

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const params = filter !== "all" ? { ledgerType: filter } : {};
            const response = await getEmployeeLedger(employeeId, params);
            if (response.status) setLedger(response.data);
        } catch (error) {
            console.error("Failed to fetch ledger:", error);
        } finally {
            setLoading(false);
        }
    };

    const typeColors = {
        ebf: "bg-blue-100 text-blue-800",
        loan: "bg-purple-100 text-purple-800"
    };

    if (loading) return <div className="text-center py-4">Loading...</div>;
    if (ledger.length === 0) return <div className="text-center py-4 text-gray-500">No ledger entries</div>;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
                <div className="flex space-x-4">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                        <option value="all">All Transactions</option>
                        <option value="ebf">EBF Only</option>
                        <option value="loan">Loan Only</option>
                    </select>
                </div>
            </div>
            
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Opening</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Credit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Debit</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Closing</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {ledger.map((entry) => (
                        <tr key={entry._id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                {new Date(entry.transactionDate).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[entry.ledgerType]}`}>
                                    {entry.ledgerType.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                                {entry.voucherNumber || "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                                {entry.openingBalance?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-green-600">
                                {entry.credit > 0 ? `+${entry.credit.toLocaleString()}` : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-red-600">
                                {entry.debit > 0 ? `-${entry.debit.toLocaleString()}` : "-"}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium">
                                {entry.closingBalance?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                                {entry.remarks || "-"}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LedgerView;
