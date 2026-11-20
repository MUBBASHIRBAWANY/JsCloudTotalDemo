import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataGrid } from '@mui/x-data-grid';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion, createDataFunction, updateDataFunction } from '../../../Api/CRUDFunctions';

const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    submitted: 'bg-blue-100 text-blue-700',
    hr_approved: 'bg-yellow-100 text-yellow-700',
    finance_approved: 'bg-indigo-100 text-indigo-700',
    voucher_generated: 'bg-purple-100 text-purple-700',
    paid: 'bg-green-100 text-green-700',
    recovering: 'bg-teal-100 text-teal-700',
    closed: 'bg-gray-200 text-gray-500',
    cancelled: 'bg-red-100 text-red-700'
};

const nextAction = {
    draft: "Submit",
    submitted: "HR Approve",
    hr_approved: "Finance Approve",
    finance_approved: "Generate Voucher",
    voucher_generated: "Mark Paid",
    paid: null,
    recovering: null,
    closed: null,
    cancelled: null
};

const nextStatus = {
    draft: "submitted",
    submitted: "hr_approved",
    hr_approved: "finance_approved",
    finance_approved: "voucher_generated",
    voucher_generated: "paid"
};

const SalaryAdvanceList = () => {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    const getData = async () => {
        setLoading(true);
        try {
            const res = await getDataFundtion('SalaryAdvance/');
            setRows(res.data || []);
        } catch { toast.error("Failed to load"); }
        setLoading(false);
    };

    useEffect(() => { getData(); }, []);

    const handleTransition = async (id, status) => {
        try {
            if (status === "voucher_generated") {
                await createDataFunction(`SalaryAdvance/generate-voucher/${id}`, {});
                toast.success("Payment voucher generated");
            } else {
                await updateDataFunction(`SalaryAdvance/transition/${id}`, { status });
                toast.success(`Status updated to ${status}`);
            }
            getData();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Action failed");
        }
    };

    const columns = [
        { field: 'advanceNumber', headerName: 'Advance #', width: 160 },
        { field: 'employeeId', headerName: 'Employee', flex: 1, minWidth: 200,
            valueGetter: (v) => v ? `${v.code} - ${v.firstName} ${v.lastName || ''}` : '' },
        { field: 'amount', headerName: 'Amount', width: 120,
            valueFormatter: (v) => `Rs. ${(v || 0).toLocaleString()}` },
        { field: 'outstanding', headerName: 'Outstanding', width: 120,
            valueFormatter: (v) => `Rs. ${(v || 0).toLocaleString()}` },
        { field: 'status', headerName: 'Status', width: 140,
            renderCell: (params) => (
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[params.value] || ''}`}>
                    {params.value?.replace(/_/g, ' ')}
                </span>
            ) },
        { field: 'actions', headerName: '', width: 200,
            renderCell: (params) => (
                <div className="flex gap-1">
                    <button onClick={() => navigate(`/SalaryAdvance/${params.row._id}`)} className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                    {nextAction[params.row.status] && (
                        <button onClick={() => handleTransition(params.row._id, nextStatus[params.row.status])}
                            className="text-green-600 hover:text-green-800 text-sm ml-2">
                            {nextAction[params.row.status]}
                        </button>
                    )}
                </div>
            ) }
    ];

    return (
        <div className="pd-card p-6">
            <ToastContainer />
            <div className="flex justify-between items-center mb-4">
                <h2 className="pd-section-title">Salary Advances</h2>
                <button className="pd-btn-save" onClick={() => navigate('/SalaryAdvanceAdd')}>New Advance</button>
            </div>
            <div style={{ height: 500, width: '100%' }}>
                <DataGrid rows={rows} columns={columns} loading={loading} getRowId={r => r._id} />
            </div>
        </div>
    );
};

export default SalaryAdvanceList;
