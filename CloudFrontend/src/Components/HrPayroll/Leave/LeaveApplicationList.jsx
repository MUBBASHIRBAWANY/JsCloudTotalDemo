import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { useDispatch } from 'react-redux';
import { fetchLeaveApplication } from '../../../Redux/Reducers/LeaveReducer';
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { DialogContent } from '@mui/material';

const LeaveApplicationList = () => {
  const [rows, setRows] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [openRejectDialog, setOpenRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const dispatch = useDispatch();

  const getData = async () => {
    const data = await getDataFundtion('HrLeave/');
    const list = data.data || [];
    dispatch(fetchLeaveApplication(list));
    setRows(list);
  };
  
  console.log(rows, 'rows');
  useEffect(() => { getData(); }, []);

  const handleApprove = async (row) => {
    await updateDataFunction(`/HrLeave/approve/${row._id}`, {});
    setRows(rows.map((r) => r._id === row._id ? { ...r, status: 'Approved' } : r));
    toast.success('Leave approved');
  };

  const handleRejectClick = (row) => {
    setSelectedRow(row);
    setRejectReason('');
    setOpenRejectDialog(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reject reason');
      return;
    }
    await updateDataFunction(`/HrLeave/reject/${selectedRow._id}`, { reason: rejectReason });
    setRows(rows.map((r) => r._id === selectedRow._id ? { ...r, status: 'Rejected', rejectReason } : r));
    setOpenRejectDialog(false);
    toast.success('Leave rejected');
  };

  const filteredRows = statusFilter
    ? rows.filter((r) => r.status === statusFilter)
    : rows;

  const statusCell = (value) => {
    const map = {
      Approved: { color: 'teal', label: 'Yes' },
      Rejected: { color: 'red', label: 'No' },
      Pending: { color: 'orange', label: 'Pending' },
    };
    const cfg = map[value] || { color: 'default', label: value };
    return (
      <span style={{ color: cfg.color, fontWeight: 500 }}>{cfg.label}</span>
    );
  };
  const columns = [
    {
      field: 'employee',
      headerName: 'Employee',
      flex: 1,
      minWidth: 200,
      valueGetter: (value, row) => {
        const emp = row.employeeId?.name || row.employee?.name;
        if (!emp) return '';
        const name = emp.firstName && emp.lastName
          ? `${emp.firstName} ${emp.lastName}`
          : emp.name || '';
        return name ? `${name} (${emp.code || emp._id})` : '';
      },
    },
    {
      field: 'leaveType',
      headerName: 'Leave Type',
      flex: 1,
      minWidth: 150,
      valueGetter: (value, row) => {
        const lt = row.leaveTypeId || row.leaveType;
        if (!lt) return '';
        return lt.name || lt;
      },
    },
    { field: 'fromDate', headerName: 'From Date', width: 130, valueFormatter: (v) => v ? new Date(v).toLocaleDateString('en-GB') : '' },
    { field: 'toDate', headerName: 'To Date', width: 130, valueFormatter: (v) => v ? new Date(v).toLocaleDateString('en-GB') : '' },
    { field: 'days', headerName: 'Days', width: 80, type: 'number' },
    { field: 'reason', headerName: 'Reason', flex: 1, minWidth: 150 },
    { field: 'status', headerName: 'Status', width: 120, valueGetter: (value, row) => statusCell(row.status) },
    { field: 'appliedOn', headerName: 'Applied On', width: 140, valueFormatter: (v) => v ? new Date(v).toLocaleString('en-GB') : '' },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 140,
      getActions: (params) => {
        const row = params.row;
        const items = [];
        if (row.status === 'Pending') {
          items.push(
            <GridActionsCellItem
              icon={<CheckCircleIcon style={{ color: 'teal' }} />}
              label="Approve"
              onClick={() => handleApprove(row)}
            />
          );
          items.push(
            <GridActionsCellItem
              icon={<CancelIcon style={{ color: 'red' }} />}
              label="Reject"
              onClick={() => handleRejectClick(row)}
            />
          );
        }
        return items;
      },
    },
  ];

  return (
    <div>
      <ToastContainer />
      <div className="flex gap-4 mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="pd-input">
          <option value="">All</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>
      </div>
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row._id}
          pageSize={25}
          rowsPerPageOptions={[25, 50, 100]}
          disableRowSelectionOnClick
          sx={{
            '& .MuiDataGrid-columnHeader': {
              borderBottom: '1px solid #e2e8f0',
            },
            '& .MuiDataGrid-row': {
              borderBottom: '1px solid #e2e8f0',
              '&:hover': {
                backgroundColor: '#f8fafc',
              },
            },
          }}
        />
      </div>
      <Dialog open={openRejectDialog} onClose={() => setOpenRejectDialog(false)}>
        <DialogTitle>Reject Leave</DialogTitle>
        <DialogContent>
          <div className="mt-2">
            <label className="block text-sm font-medium mb-1">Reject Reason *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full pd-input"
              rows={3}
              placeholder="Enter reason for rejection"
            />
          </div>
        </DialogContent>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenRejectDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmReject}>Reject</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LeaveApplicationList;
