import React, { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import api from '../../../Api/ApiInstance';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_COLORS = {
    present: 'bg-green-400',
    late: 'bg-yellow-400',
    absent: 'bg-red-400',
    leave: 'bg-purple-400',
    'half-day': 'bg-orange-300',
    holiday: 'bg-blue-300',
    'off-day': 'bg-gray-300',
};

const STATUS_LEGEND = [
    { label: 'Present', color: 'bg-green-400' },
    { label: 'Late', color: 'bg-yellow-400' },
    { label: 'Absent', color: 'bg-red-400' },
    { label: 'Leave', color: 'bg-purple-400' },
    { label: 'Half-Day', color: 'bg-orange-300' },
    { label: 'Holiday', color: 'bg-blue-300' },
    { label: 'Off-Day', color: 'bg-gray-300' },
];

const AttendanceDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [department, setDepartment] = useState('');
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        getDataFundtion("HrDepartment/getDepartmentNameId").then((res) => setDepartments(res.data || []));
    }, []);

    useEffect(() => {
        loadDashboard();
    }, [month, year, department]);

    const getDataFundtion = async (endpoint) => {
        try {
            const response = await api.get(endpoint);
            return response.data;
        } catch (error) {
            return { data: [] };
        }
    };

    const loadDashboard = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ month, year });
            if (department) params.append('department', department);
            const res = await api.get(`/HrAttendance/dashboard?${params}`);
            setData(res.data.data || res.data);
        } catch (err) {
            toast.error('Failed to load dashboard');
        } finally {
            setLoading(false);
        }
    };

    const years = [];
    const currentYear = new Date().getFullYear();
    for (let y = currentYear - 3; y <= currentYear + 1; y++) years.push(y);

    const daysInMonth = new Date(year, month, 0).getDate();

    return (
        <div className="pd-card p-6">
            <ToastContainer />
            <h3 className="text-lg font-semibold pd-section-title mb-4">Attendance Dashboard</h3>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-6">
                <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="pd-input text-sm">
                    {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="pd-input text-sm">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="pd-input text-sm">
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                </select>
            </div>

            {loading && <div className="text-center py-10 text-gray-500">Loading dashboard...</div>}

            {!loading && data && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
                        <SummaryCard label="Employees" value={data.summary?.totalEmployees || 0} color="bg-gray-100" />
                        <SummaryCard label="Working Days" value={data.summary?.totalWorkingDays || 0} color="bg-gray-100" />
                        <SummaryCard label="Present" value={data.summary?.present || 0} color="bg-green-50" textColor="text-green-700" />
                        <SummaryCard label="Absent" value={data.summary?.absent || 0} color="bg-red-50" textColor="text-red-700" />
                        <SummaryCard label="Late" value={data.summary?.late || 0} color="bg-yellow-50" textColor="text-yellow-700" />
                        <SummaryCard label="Leave" value={data.summary?.leave || 0} color="bg-purple-50" textColor="text-purple-700" />
                        <SummaryCard label="Off Days" value={data.summary?.offDays || 0} color="bg-gray-50" />
                        <SummaryCard label="Attendance %" value={`${data.summary?.attendanceRate || 0}%`} color="bg-blue-50" textColor="text-blue-700" />
                    </div>

                    {/* Department Breakdown */}
                    {Object.keys(data.departmentStats || {}).length > 0 && (
                        <div className="mb-6">
                            <h4 className="text-sm font-semibold mb-3">Department Breakdown</h4>
                            <div className="overflow-x-auto rounded-lg border pd-border-default">
                                <table className="pd-data-table min-w-full text-sm">
                                    <thead>
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium">Department</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium">Headcount</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium">Present</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium">Absent</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium">Late</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium">Leave</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium">Att %</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[color:var(--pd-border-card)]">
                                        {Object.entries(data.departmentStats).map(([dept, stats]) => (
                                            <tr key={dept}>
                                                <td className="px-3 py-2 font-medium">{dept}</td>
                                                <td className="px-3 py-2 text-right">{stats.headcount}</td>
                                                <td className="px-3 py-2 text-right text-green-600">{stats.present}</td>
                                                <td className="px-3 py-2 text-right text-red-600">{stats.absent}</td>
                                                <td className="px-3 py-2 text-right text-yellow-600">{stats.late}</td>
                                                <td className="px-3 py-2 text-right text-purple-600">{stats.leave}</td>
                                                <td className="px-3 py-2 text-right font-medium">
                                                    {stats.workingDays > 0 ? Math.round((stats.present / (stats.workingDays * stats.headcount)) * 100) : 0}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Heatmap Legend */}
                    <div className="flex flex-wrap gap-3 mb-3">
                        {STATUS_LEGEND.map(item => (
                            <div key={item.label} className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded ${item.color}`} />
                                <span className="text-xs text-gray-600">{item.label}</span>
                            </div>
                        ))}
                    </div>

                    {/* Daily Heatmap */}
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold mb-3">Daily Attendance Heatmap</h4>
                        <div className="overflow-x-auto rounded-lg border pd-border-default">
                            <table className="min-w-full text-sm">
                                <thead>
                                    <tr>
                                        <th className="px-2 py-2 text-left text-xs font-medium sticky left-0 bg-white z-10 min-w-[120px]">Employee</th>
                                        {Array.from({ length: daysInMonth }, (_, i) => (
                                            <th key={i} className="px-1 py-2 text-center text-xs font-medium min-w-[28px]">
                                                {i + 1}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {(data.dailyHeatmap || []).map((emp, ei) => (
                                        <tr key={ei} className="border-t border-[color:var(--pd-border-card)]">
                                            <td className="px-2 py-1.5 text-xs sticky left-0 bg-white z-10 whitespace-nowrap">
                                                <span className="font-medium">{emp.code}</span>
                                                <span className="text-gray-500 ml-1">{emp.employee}</span>
                                            </td>
                                            {emp.days.map((day, di) => (
                                                <td key={di} className="px-0.5 py-1">
                                                    <div
                                                        className={`w-5 h-5 rounded-sm mx-auto ${STATUS_COLORS[day.status] || 'bg-gray-200'}`}
                                                        title={`${day.date}: ${day.status}`}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {(data.dailyHeatmap || []).length === 0 && (
                            <p className="text-center text-gray-500 py-4">No attendance data for this period</p>
                        )}
                    </div>

                    {/* Holiday List */}
                    {data.holidayList?.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold mb-3">Holidays This Month</h4>
                            <div className="flex flex-wrap gap-2">
                                {data.holidayList.map((h, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                        {h.date} — {h.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

function SummaryCard({ label, value, color, textColor }) {
    return (
        <div className={`${color} rounded-lg p-3 text-center`}>
            <p className={`text-2xl font-bold ${textColor || 'text-gray-800'}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
        </div>
    );
}

export default AttendanceDashboard;
