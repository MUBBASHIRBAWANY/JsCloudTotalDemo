import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const LeaveReportPage = () => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);
        getDataFundtion(`HrAttendanceReport/leave-balance?year=${year}`)
            .then(res => setData(res.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [year]);

    return (
        <div className="pd-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Leave Balance Report</h2>
                <select value={year} onChange={e => setYear(+e.target.value)} className="pd-input w-24">
                    {Array.from({length:5}, (_,i) => (
                        <option key={year-2+i} value={year-2+i}>{year-2+i}</option>
                    ))}
                </select>
            </div>

            {loading ? <p className="text-gray-500">Loading...</p> : (
                <div className="space-y-4">
                    {data.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">No data found</p>
                    ) : (
                        data.map(emp => (
                            <div key={emp.code} className="border rounded-lg p-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="font-semibold">{emp.code}</span>
                                    <span className="text-gray-600">{emp.name}</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {emp.balances.map(bal => (
                                        <div key={bal.code} className="rounded-lg p-3" style={{ backgroundColor: bal.color + '15' }}>
                                            <p className="text-xs font-medium" style={{ color: bal.color }}>{bal.leaveType}</p>
                                            <div className="flex justify-between mt-1 text-xs">
                                                <span className="text-gray-500">Allocated: {bal.allocated}</span>
                                                <span className="text-gray-500">Used: {bal.used}</span>
                                            </div>
                                            <p className="text-lg font-bold mt-1" style={{ color: bal.color }}>{bal.balance}</p>
                                            <p className="text-xs text-gray-400">remaining</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default LeaveReportPage;
