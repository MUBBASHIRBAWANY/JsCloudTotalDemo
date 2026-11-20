import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const LoanList = () => {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const navigate = useNavigate();

  const getData = async () => {
    const data = await getDataFundtion("HrLoan/");
    console.log(data);
    
    setRows(data.data || []);
  };

  useEffect(() => { getData(); }, []);

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true); };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/HrLoan/delete/${selectedId}`);
    setRows(rows.filter((r) => r._id !== selectedId));
    toast.success("Deleted");
  };

  const columns = [
    {
      field: 'employeeId', headerName: 'Employee', flex: 1, minWidth: 200,
      valueGetter: (value) => value ? `${value.firstName} ${value.lastName || ''} (${value.code})` : '',
    },
    { field: 'totalAmount', headerName: 'Total', width: 120, valueFormatter: (v) => `Rs. ${Number(v || 0).toLocaleString()}` },
    { field: 'remainingBalance', headerName: 'Remaining', width: 120, valueFormatter: (v) => `Rs. ${Number(v || 0).toLocaleString()}` },
    { field: 'monthlyDeduction', headerName: 'Monthly', width: 120, valueFormatter: (v) => `Rs. ${Number(v || 0).toLocaleString()}` },
    { field: 'startDate', headerName: 'Start', width: 120 },
    {
      field: 'status', headerName: 'Status', width: 110,
      renderCell: (params) => <Chip label={params.value} color={params.value === 'active' ? 'warning' : params.value === 'settled' ? 'success' : params.value === 'cancelled' || params.value === 'defaulted' ? 'error' : 'default'} size="small" />,
    },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 120,
      getActions: (params) => [
        <GridActionsCellItem icon={<VisibilityIcon />} label="View" onClick={() => navigate(`/LoanView/${params.row._id}`)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDeleteClick(params.row._id)} />,
      ],
    },
  ];

  return (
    <div>
      <ToastContainer />
      <div style={{ height: 400, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSize={25} disableRowSelectionOnClick />
      </div>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Loan?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LoanList;
