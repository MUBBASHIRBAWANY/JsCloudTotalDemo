import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion, createDataFunction, updateDataFunction } from '../../../Api/CRUDFunctions';

const CorrectionRequestList = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [remarkDialog, setRemarkDialog] = useState(null);
    const [remark, setRemark] = useState('');

    const getData = async () => {
        setLoading(true);
        try {
            const res = await getDataFundtion(`HrAttendanceCorrection?status=${statusFilter}`);
            setRows(res.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setLoading(false);
    };

    useEffect(() => { getData(); }, [statusFilter]);

    const handleApprove = async (id) => {
        try {
            await updateDataFunction(`HrAttendanceCorrection/${id}/approve`, { approverRemark: 'Approved' });
            toast.success('Approved');
            getData();
        } catch { toast.error('Failed'); }
    };

    const handleReject = async () => {
        if (!remark) return toast.error('Remark required');
        try {
            await updateDataFunction(`HrAttendanceCorrection/${remarkDialog}/reject`, { approverRemark: remark });
            toast.success('Rejected');
            setRemarkDialog(null);
            setRemark('');
            getData();
        } catch { toast.error('Failed'); }
    };

    const columns = [
        { field: 'employeeId', headerName: 'Employee', flex: 1, minWidth: 150,
            valueGetter: (v) => v ? `${v.code || ''} - ${v.firstName || ''} ${v.lastName || ''}` : '' },
        { field: 'date', headerName: 'Date', width: 110 },
        { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 200 },
        { field: 'status', headerName: 'Status', width: 100,
            renderCell: (params) => {
                const colors = { pending: 'bg-yellow-100 text-yellow-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
                return <span className={`px-2 py-1 rounded text-xs font-medium ${colors[params.value] || ''}`}>{params.value}</span>;
            }
        },
        { field: 'createdAt', headerName: 'Requested', width: 160,
            valueGetter: (v) => v ? new Date(v).toLocaleDateString() : '' },
        { field: 'actions', headerName: '', width: 120,
            renderCell: (params) => {
                if (params.row.status !== 'pending') return null;
                return (
                    <div className="flex gap-1">
                        <button onClick={() => handleApprove(params.row._id)} className="text-green-600 hover:text-green-800 text-xs px-2 py-1 bg-green-50 rounded">Approve</button>
                        <button onClick={() => setRemarkDialog(params.row._id)} className="text-red-600 hover:text-red-800 text-xs px-2 py-1 bg-red-50 rounded">Reject</button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="pd-card p-6">
            <ToastContainer />
            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Attendance Corrections</h2>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="pd-input w-32">
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div style={{ height: 400, width: '100%' }}>
                <DataGrid rows={rows} columns={columns} loading={loading}
                    getRowId={row => row._id} pageSize={25} disableRowSelectionOnClick />
            </div>

            {remarkDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-2">Reject Correction</h3>
                        <textarea value={remark} onChange={e => setRemark(e.target.value)} rows={3}
                            className="w-full pd-input mb-3" placeholder="Reason for rejection" />
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setRemarkDialog(null); setRemark(''); }} className="pd-btn-outline">Cancel</button>
                            <button onClick={handleReject} className="px-4 py-2 rounded text-white text-sm bg-red-600 hover:bg-red-700">Reject</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorrectionRequestList;
