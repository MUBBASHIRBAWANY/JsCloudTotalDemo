import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const AdjustmentList = () => {
  const [rows, setRows] = useState([]);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

  const getData = async () => {
    const data = await getDataFundtion(`HrPayrollAdjustment/?month=${filterMonth}&year=${filterYear}`);
    setRows(data.data || []);
  };

  useEffect(() => { getData(); }, [filterMonth, filterYear]);

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true); };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/HrPayrollAdjustment/delete/${selectedId}`);
    setRows(rows.filter((r) => r._id !== selectedId));
    toast.success("Deleted");
  };

  const columns = [
    {
      field: 'employeeId', headerName: 'Employee', flex: 1, minWidth: 200,
      valueGetter: (value) => value ? `${value.firstName} ${value.lastName || ''} (${value.code})` : '',
    },
    { field: 'type', headerName: 'Type', width: 150 },
    { field: 'amount', headerName: 'Amount', width: 130, valueFormatter: (v) => `Rs. ${Number(v || 0).toLocaleString()}` },
    { field: 'description', headerName: 'Description', flex: 1, minWidth: 200 },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 80,
      getActions: (params) => [
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDeleteClick(params.row._id)} />,
      ],
    },
  ];

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);

  return (
    <div>
      <ToastContainer />
      <div className="flex gap-4 mb-4">
        <select value={filterMonth} onChange={(e) => setFilterMonth(Number(e.target.value))} className="pd-input">
          {months.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>
        <select value={filterYear} onChange={(e) => setFilterYear(Number(e.target.value))} className="pd-input">
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
      <div style={{ height: 400, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSize={25} disableRowSelectionOnClick />
      </div>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Adjustment?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default AdjustmentList;
