import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import Chip from '@mui/material/Chip';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchHrEmployee } from '../../../Redux/Reducers/HrEmployeeReducer';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const EmployeeList = () => {
  const [rows, setRows] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getData = async () => {
    const [empRes, storeRes] = await Promise.all([
      getDataFundtion("HrEmployee/"),
      getDataFundtion("Store"),
    ]);
    const list = empRes.data || [];
    const storeList = storeRes.data || [];
    setStores(storeList);
    dispatch(fetchHrEmployee(list));
    setRows(list);
  };

  useEffect(() => { getData(); }, []);

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true); };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/HrEmployee/deleteEmployee/${selectedId}`);
    setRows(rows.filter((row) => row._id !== selectedId));
    toast.success("Employee deleted");
  };

  const columns = [
    { field: 'code', headerName: 'Code', width: 80 },
    {
      field: 'firstName', headerName: 'Name', flex: 1, minWidth: 180,
      valueGetter: (value, row) => `${row.firstName} ${row.lastName || ''}`,
    },
    { field: 'phone', headerName: 'Phone', width: 120 },
    {
      field: 'departmentId', headerName: 'Department', flex: 1, minWidth: 130,
      valueGetter: (value) => value?.name || '',
    },
    {
      field: 'designationId', headerName: 'Designation', flex: 1, minWidth: 130,
      valueGetter: (value) => value?.name || '',
    },
    {
      field: 'storeId', headerName: 'Business', flex: 1, minWidth: 120,
      valueGetter: (value) => {
        if (!value) return '';
        const store = stores.find(s => s._id === value);
        return store?.StoreName || '';
      },
    },
    // {
    //   field: 'reportsTo', headerName: 'Reports To', flex: 1, minWidth: 150,
    //   valueGetter: (value) => value ? `${value.firstName || ''} ${value.lastName || ''}`.trim() : '',
    // },
    {
      field: 'employmentType', headerName: 'Type', width: 100,
    },
    {
      field: 'basicSalary', headerName: 'Basic Salary', width: 130,
      valueGetter: (value, row) => row.salarySetupBasket?.basicSalary || 0,
      valueFormatter: (value) => `Rs. ${Number(value || 0).toLocaleString()}`,
    },
    // {
    //   field: 'dailySalary', headerName: 'Daily Salary', width: 120,
    //   valueGetter: (value, row) => row.salaryRates?.dailySalary || 0,
    //   valueFormatter: (value) => `Rs. ${Number(value || 0).toLocaleString()}`,
    // },
    {
      field: 'status', headerName: 'Status', width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={params.value === 'active' ? 'success' : params.value === 'inactive' ? 'warning' : params.value === 'on_notice' ? 'info' : 'error'}
          size="small"
        />
      ),
    },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 100,
      getActions: (params) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => navigate(`/EmployeeHrEdit/${params.row._id}`)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDeleteClick(params.row._id)} />,
      ],
    },
  ];

  return (
    <div>
      <ToastContainer />
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} getRowId={(row) => row._id} pageSize={25} rowsPerPageOptions={[25, 50, 100]} disableRowSelectionOnClick />
      </div>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Employee?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default EmployeeList;
