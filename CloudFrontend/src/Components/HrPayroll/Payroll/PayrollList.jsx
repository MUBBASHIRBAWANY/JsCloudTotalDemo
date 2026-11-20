import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions';

const statusTabs = ['all', 'draft', 'processed', 'approved', 'paid', 'closed'];
const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    processed: 'bg-blue-100 text-blue-700',
    approved: 'bg-yellow-100 text-yellow-700',
    paid: 'bg-green-100 text-green-700',
    closed: 'bg-purple-100 text-purple-700'
};

const PayrollList = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [statusFilter, setStatusFilter] = useState('all');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    const getData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ month, year });
            if (statusFilter !== 'all') params.append('status', statusFilter);
            const data = await getDataFundtion(`Payroll/?${params}`);
            setRows(data.data || []);
        } catch { toast.error("Failed to load payroll"); }
        setLoading(false);
    };

    useEffect(() => { getData(); }, [month, year, statusFilter]);

    const handleBulkAction = async (action) => {
        if (selectedIds.size === 0) return toast.error("Select employees first");
        setConfirmAction(action);
    };

    const executeBulkAction = async () => {
        const action = confirmAction;
        setConfirmAction(null);

        const endpoints = {
            process: '/Payroll/process',
            approve: '/Payroll/approve',
            paid: '/Payroll/markPaidBulk',
            close: '/Payroll/close'
        };

        try {
            const payload = action === 'close'
                ? { month: parseInt(month), year: parseInt(year) }
                : { payrollIds: Array.from(selectedIds), month: parseInt(month), year: parseInt(year) };
            const res = await createDataFunction(endpoints[action], payload);
            const d = res.data;
            if (d.generated !== undefined) {
                toast.success(`Generated: ${d.generated}, Skipped: ${d.skipped}`);
            } else {
                const parts = [];
                if (d.processed) parts.push(`Processed: ${d.processed}`);
                if (d.closed) parts.push(`Closed: ${d.closed}`);
                if (d.skipped) parts.push(`Skipped: ${d.skipped}`);
                if (d.failed) parts.push(`Failed: ${d.failed}`);
                if (d.failed > 0 && d.errors?.length > 0) {
                    toast.error(`${parts.join(' | ')} — ${d.errors[0].error}`);
                } else {
                    toast.success(parts.join(' | ') || 'Done');
                }
            }
            setSelectedIds(new Set());
            getData();
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || "Action failed";
            toast.error(msg);
        }
    };

    const columns = [
        { field: 'employeeId', headerName: 'Employee', flex: 1, minWidth: 200,
            valueGetter: (v) => v ? `${v.code} - ${v.firstName} ${v.lastName || ''}` : '' },
        { field: 'grossSalary', headerName: 'Gross', width: 110,
            valueFormatter: (v) => `Rs. ${Math.round(v || 0).toLocaleString()}` },
        { field: 'totalDeductions', headerName: 'Deductions', width: 110,
            valueFormatter: (v) => `Rs. ${Math.round(v || 0).toLocaleString()}` },
        { field: 'netSalary', headerName: 'Net Salary', width: 120,
            valueFormatter: (v) => `Rs. ${Math.round(v || 0).toLocaleString()}` },
        { field: 'presentDays', headerName: 'Present', width: 80 },
        { field: 'absentDays', headerName: 'Absent', width: 80 },
        { field: 'lateDays', headerName: 'Late', width: 70 },
        { field: 'status', headerName: 'Status', width: 110,
            renderCell: (params) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[params.value] || ''}`}>
                    {params.value}
                </span>
            ) },
        { field: 'actions', headerName: '', width: 80,
            renderCell: (params) => (
                <button onClick={() => navigate(`/Payslip/${params.row._id}`)}
                    className="text-blue-600 hover:text-blue-800 text-sm">View</button>
            ) }
    ];

    const selectedStatuses = rows.filter(r => selectedIds.has(r._id)).map(r => r.status);
    const canProcess = selectedStatuses.length > 0 && selectedStatuses.every(s => s === 'draft');
    const canApprove = selectedStatuses.length > 0 && selectedStatuses.every(s => s === 'processed');
    const canPay = selectedStatuses.length > 0 && selectedStatuses.every(s => s === 'approved');
    const canClose = selectedStatuses.length > 0 && selectedStatuses.every(s => s === 'paid');

    return (
        <div className="pd-card p-6">
            <ToastContainer />

            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Payroll</h2>
                <div className="flex gap-3 items-center">
                    <select value={month} onChange={e => setMonth(e.target.value)} className="pd-input w-32">
                        {Array.from({length:12}, (_,i) => (
                            <option key={i+1} value={i+1}>{new Date(0,i).toLocaleString('default',{month:'long'})}</option>
                        ))}
                    </select>
                    <select value={year} onChange={e => setYear(e.target.value)} className="pd-input w-24">
                        {Array.from({length:5}, (_,i) => (
                            <option key={year-2+i} value={year-2+i}>{year-2+i}</option>
                        ))}
                    </select>
                    <button className="pd-btn-save" onClick={() => navigate('/PayrollGenerate')}>Generate</button>
                </div>
            </div>

            {/* Status Tabs */}
            <div className="flex gap-2 mb-4">
                {statusTabs.map(tab => (
                    <button key={tab} onClick={() => setStatusFilter(tab)}
                        className={`px-3 py-1 rounded text-sm font-medium capitalize transition
                            ${statusFilter === tab ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {tab}
                    </button>
                ))}
            </div>

            {/* Close Payroll - only visible when there are paid records */}
            {rows.some(r => r.status === 'paid') && (
                <div className="flex gap-2 mb-4 p-3 bg-purple-50 rounded-lg items-center">
                    <span className="text-sm text-purple-700 font-medium">Close Payroll for {new Date(0, month - 1).toLocaleString('default', { month: 'long' })} {year}</span>
                    <button onClick={() => handleBulkAction('close')}
                        className="px-3 py-1 rounded text-sm bg-purple-600 text-white hover:bg-purple-700 ml-auto">
                        Close Payroll
                    </button>
                </div>
            )}

            {/* Bulk Action Toolbar - only for individual selection */}
            {selectedIds.size > 0 && (
                <div className="flex gap-2 mb-4 p-3 bg-blue-50 rounded-lg items-center">
                    <span className="text-sm text-blue-700 font-medium">{selectedIds.size} selected</span>
                    <div className="flex gap-2 ml-auto">
                        <button disabled={!canProcess} onClick={() => handleBulkAction('process')}
                            className={`px-3 py-1 rounded text-sm ${canProcess ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                            Process
                        </button>
                        <button disabled={!canApprove} onClick={() => handleBulkAction('approve')}
                            className={`px-3 py-1 rounded text-sm ${canApprove ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                            Approve
                        </button>
                        <button disabled={!canPay} onClick={() => handleBulkAction('paid')}
                            className={`px-3 py-1 rounded text-sm ${canPay ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                            Mark Paid
                        </button>
                    </div>
                </div>
            )}

            {/* Confirmation Dialog */}
            {confirmAction && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
                        <h3 className="text-lg font-semibold mb-2">Confirm {confirmAction === 'close' ? 'Close Payroll' : confirmAction}</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            {confirmAction === 'close'
                                ? 'This will create a Journal Voucher and post to the General Ledger. This action cannot be undone.'
                                : `This will ${confirmAction} ${selectedIds.size} payroll record(s).`}
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setConfirmAction(null)} className="pd-btn-outline">Cancel</button>
                            <button onClick={executeBulkAction}
                                className={`px-4 py-2 rounded text-white text-sm ${confirmAction === 'close' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ height: 500, width: '100%' }}>
                <DataGrid
                    rows={rows}
                    columns={columns}
                    loading={loading}
                    getRowId={row => row._id}
                    checkboxSelection
                    onRowSelectionModelChange={(newModel) => {
                        setSelectedIds(newModel.ids);
                    }}
                    rowSelectionModel={{ type: 'include', ids: selectedIds }}
                    disableRowSelectionOnClick
                    pageSize={25}
                />
            </div>
        </div>
    );
};

export default PayrollList;
