import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const StatCard = ({ label, value, color = 'bg-white' }) => (
    <div className={`${color} rounded-lg p-4 text-center`}>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
);

const PayrollDashboard = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [stats, setStats] = useState(null);

    useEffect(() => {
        const load = async () => {
            try {
                const [statusRes, summaryRes] = await Promise.all([
                    getDataFundtion(`Payroll/monthStatus?month=${month}&year=${year}`),
                    getDataFundtion(`Payroll/summary?month=${month}&year=${year}`)
                ]);
                setStats({ ...statusRes.data, ...summaryRes.data?.total });
            } catch { console.error("Failed to load dashboard"); }
        };
        load();
    }, [month, year]);

    return (
        <div className="pd-card p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="pd-section-title">Payroll Dashboard</h2>
                <div className="flex gap-3">
                    <select value={month} onChange={e => setMonth(+e.target.value)} className="pd-input w-32">
                        {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(+e.target.value)} className="pd-input w-24">
                        {Array.from({length:5}, (_,i) => <option key={year-2+i} value={year-2+i}>{year-2+i}</option>)}
                    </select>
                </div>
            </div>

            {stats && (
                <>
                    <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-6">
                        <StatCard label="Total Employees" value={stats.total || 0} color="bg-gray-50" />
                        <StatCard label="Draft" value={stats.draft || 0} color="bg-gray-100" />
                        <StatCard label="Processed" value={stats.processed || 0} color="bg-blue-50" />
                        <StatCard label="Approved" value={stats.approved || 0} color="bg-yellow-50" />
                        <StatCard label="Paid" value={stats.paid || 0} color="bg-green-50" />
                        <StatCard label="Closed" value={stats.closed || 0} color="bg-purple-50" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard label="Total Gross Salary" value={`Rs. ${(stats.totalGrossSalary || 0).toLocaleString()}`} color="bg-blue-50" />
                        <StatCard label="Total Deductions" value={`Rs. ${(stats.totalDeductions || 0).toLocaleString()}`} color="bg-red-50" />
                        <StatCard label="Total Net Salary" value={`Rs. ${(stats.totalNetSalary || 0).toLocaleString()}`} color="bg-green-50" />
                    </div>
                </>
            )}
        </div>
    );
};

export default PayrollDashboard;
