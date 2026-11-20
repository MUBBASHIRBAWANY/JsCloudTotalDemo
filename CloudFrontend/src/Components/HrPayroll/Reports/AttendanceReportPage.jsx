import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { getDataFundtion } from '../../../Api/CRUDFunctions';

const AttendanceReportPage = () => {
    const [tab, setTab] = useState('daily');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchReport = () => {
        setLoading(true);
        let url = '';
        if (tab === 'daily') url = `HrAttendanceReport/daily?date=${date}`;
        else if (tab === 'monthly') url = `HrAttendanceReport/monthly?month=${month}&year=${year}`;
        else if (tab === 'late') url = `HrAttendanceReport/late?month=${month}&year=${year}`;

        getDataFundtion(url)
            .then(res => setData(res.data || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchReport(); }, [tab, month, year, date]);

    const columns = tab === 'daily' ? [
        { field: 'code', headerName: 'Code', width: 80 },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
        { field: 'checkIn', headerName: 'Check In', width: 100 },
        { field: 'checkOut', headerName: 'Check Out', width: 100 },
        { field: 'attendanceStatus', headerName: 'Status', width: 120 },
        { field: 'workMode', headerName: 'Work Mode', width: 120 },
        { field: 'overtime', headerName: 'OT Hours', width: 90 }
    ] : tab === 'monthly' ? [
        { field: 'code', headerName: 'Code', width: 80 },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
        { field: 'present', headerName: 'Present', width: 80 },
        { field: 'late', headerName: 'Late', width: 70 },
        { field: 'absent', headerName: 'Absent', width: 80 },
        { field: 'leave', headerName: 'Leave', width: 70 },
        { field: 'overtime', headerName: 'OT Hours', width: 90 }
    ] : [
        { field: 'code', headerName: 'Code', width: 80 },
        { field: 'name', headerName: 'Name', flex: 1, minWidth: 150 },
        { field: 'count', headerName: 'Late Days', width: 100 },
        { field: 'dates', headerName: 'Dates', flex: 1, minWidth: 200,
            valueGetter: (v) => v?.join(', ') || '' }
    ];

    return (
        <div className="pd-card p-6">
            <h2 className="pd-section-title mb-4">Attendance Reports</h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
                {['daily', 'monthly', 'late'].map(t => (
                    <button key={t} onClick={() => setTab(t)}
                        className={`px-3 py-1 rounded text-sm font-medium capitalize ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {t}
                    </button>
                ))}
            </div>

            {/* Filters */}
            <div className="flex gap-3 mb-4">
                {tab === 'daily' ? (
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="pd-input" />
                ) : (
                    <>
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
                    </>
                )}
            </div>

            <div style={{ height: 500, width: '100%' }}>
                <DataGrid rows={data} columns={columns} loading={loading}
                    getRowId={row => row.employeeId || row.code || Math.random()}
                    pageSize={25} disableRowSelectionOnClick />
            </div>
        </div>
    );
};

export default AttendanceReportPage;
