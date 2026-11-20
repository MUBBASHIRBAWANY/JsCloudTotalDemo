import React, { useEffect, useState } from "react";
import { getEBFBalance } from "../../../Api/EBFApi";

const EBFBalanceCard = ({ employeeId }) => {
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (employeeId) fetchBalance();
    }, [employeeId]);

    const fetchBalance = async () => {
        try {
            const response = await getEBFBalance(employeeId);
            if (response.status) setBalance(response.data);
        } catch (error) {
            console.error("Failed to fetch EBF balance:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse bg-gray-200 h-24 rounded-lg"></div>;
    if (!balance) return null;

    return (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <h3 className="text-sm font-medium opacity-80">EBF Balance</h3>
            <p className="text-3xl font-bold mt-2">{balance.balance?.toLocaleString()}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <p className="opacity-70">Total Contributions</p>
                    <p className="font-semibold">{balance.totalContributions?.toLocaleString()}</p>
                </div>
                <div>
                    <p className="opacity-70">Total Withdrawals</p>
                    <p className="font-semibold">{balance.totalWithdrawals?.toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
};

export default EBFBalanceCard;
