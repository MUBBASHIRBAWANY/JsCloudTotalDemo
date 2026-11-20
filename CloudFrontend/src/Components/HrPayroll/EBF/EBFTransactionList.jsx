import React, { useEffect, useState } from "react";
import { getEBFTransactions } from "../../../Api/EBFApi";

const typeColors = {
    contribution: "bg-green-100 text-green-800",
    withdrawal: "bg-red-100 text-red-800",
    adjustment: "bg-yellow-100 text-yellow-800"
};

const EBFTransactionList = ({ employeeId }) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employeeId) fetchTransactions();
    }, [employeeId]);

    const fetchTransactions = async () => {
        try {
            const response = await getEBFTransactions(employeeId);
            if (response.status) setTransactions(response.data);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center py-4">Loading...</div>;
    if (transactions.length === 0) return <div className="text-center py-4 text-gray-500">No transactions</div>;

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opening</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Closing</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {transactions.map((txn) => (
                        <tr key={txn._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {new Date(txn.postingDate).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${typeColors[txn.transactionType]}`}>
                                    {txn.transactionType}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium text-green-600">
                                +{txn.amount?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {txn.openingBalance?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-medium">
                                {txn.closingBalance?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {txn.salaryPeriod?.month}/{txn.salaryPeriod?.year}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EBFTransactionList;
