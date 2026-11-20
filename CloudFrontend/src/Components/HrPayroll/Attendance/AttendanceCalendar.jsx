import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const STATUS_COLORS = {
    P: 'bg-green-100 text-green-700',
    A: 'bg-red-100 text-red-700',
    L: 'bg-blue-100 text-blue-700',
    H: 'bg-purple-100 text-purple-700',
    WO: 'bg-gray-100 text-gray-500',
    HD: 'bg-yellow-100 text-yellow-700',
    WFH: 'bg-cyan-100 text-cyan-700',
    OD: 'bg-indigo-100 text-indigo-700',
    BT: 'bg-pink-100 text-pink-700',
    TR: 'bg-orange-100 text-orange-700'
};

const STATUS_MAP = {
    present: 'P', absent: 'A', leave: 'L', holiday: 'H',
    weekly_off: 'WO', half_day: 'HD', work_from_home: 'WFH',
    official_duty: 'OD', business_trip: 'BT', training: 'TR',
    late: 'P'
};

const AttendanceCalendar = () => {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [tooltip, setTooltip] = useState(null);

    const daysInMonth = new Date(year, month, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    useEffect(() => {
        setLoading(true);
        getDataFundtion(`HrAttendance/report/monthly?month=${month}&year=${year}`)
            .then(res => setData(res.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [month, year]);

    const getEmployeeAttendance = async (empId) => {
        try {
            const res = await getDataFundtion(`HrAttendance/summary/${empId}/${month}/${year}`);
            return res.data || {};
        } catch { return {}; }
    };

    return (
        <div className="pd-card p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Attendance Calendar</h2>
                <div className="flex gap-3">
                    <select value={month} onChange={e => setMonth(+e.target.value)} className="pd-input w-32">
                        {Array.from({length:12}, (_,i) => (
                            <option key={i+1} value={i+1}>{new Date(0,i).toLocaleString('default',{month:'long'})}</option>
                        ))}
                    </select>
                    <select value={year} onChange={e => setYear(+e.target.value)} className="pd-input w-24">
                        {Array.from({length:5}, (_,i) => (
                            <option key={year-2+i} value={year-2+i}>{year-2+i}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? <p className="text-gray-500">Loading...</p> : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                        <thead>
                            <tr>
                                <th className="p-2 border text-left sticky left-0 bg-white z-10">Employee</th>
                                {days.map(d => (
                                    <th key={d} className="p-1 border text-center w-8">{d}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map(emp => (
                                <tr key={emp.employeeId}>
                                    <td className="p-2 border sticky left-0 bg-white z-10 whitespace-nowrap">
                                        <span className="font-medium">{emp.code}</span>
                                        <span className="ml-1 text-gray-500">{emp.name}</span>
                                    </td>
                                    {days.map(d => {
                                        const key = `${emp.employeeId}-${d}`;
                                        return (
                                            <td key={d} className="p-0.5 border text-center"
                                                onMouseEnter={() => setTooltip({ key, emp, day: d, status: emp.attendanceStatus || 'absent' })}
                                                onMouseLeave={() => setTooltip(null)}>
                                                <span className={`inline-block w-6 h-6 leading-6 rounded text-xs font-medium cursor-default ${STATUS_COLORS[STATUS_MAP[emp.attendanceStatus] || 'A'] || ''}`}>
                                                    {STATUS_MAP[emp.attendanceStatus] || 'A'}
                                                </span>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Legend */}
            <div className="flex gap-3 mt-4 flex-wrap">
                {Object.entries(STATUS_MAP).filter(([k]) => !['late'].includes(k)).map(([status, code]) => (
                    <span key={status} className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[code]}`}>
                        {code} = {status.replace(/_/g, ' ')}
                    </span>
                ))}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div className="fixed bg-gray-800 text-white text-xs rounded p-2 shadow-lg z-50 pointer-events-none"
                    style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <p className="font-bold">{tooltip.emp.code} - {tooltip.emp.name}</p>
                    <p>Day {tooltip.day}: {tooltip.status}</p>
                </div>
            )}
        </div>
    );
};

export default AttendanceCalendar;
