import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchDeductionType } from '../../../Redux/Reducers/DeductionTypeReducer';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const DeductionTypeList = () => {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getData = async () => {
    const data = await getDataFundtion("HrDeductionType/");
    const list = data.data;
    dispatch(fetchDeductionType(list));
    setRows(list);
  };

  useEffect(() => { getData(); }, []);

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true); };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/HrDeductionType/delete/${selectedId}`);
    setRows(rows.filter((row) => row._id !== selectedId));
    toast.success("Deleted");
  };

  const columns = [
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'defaultAmount', headerName: 'Default Amount', width: 150, valueFormatter: (v) => `Rs. ${Number(v || 0).toLocaleString()}` },
    { field: 'type', headerName: 'Type', width: 120 },
    { field: 'active', headerName: 'Active', width: 100, valueFormatter: (v) => v ? 'Yes' : 'No' },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 120,
      getActions: (params) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => navigate(`/DeductionTypeEdit/${params.row._id}`)} />,
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
        <DialogTitle>Delete Deduction Type?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DeductionTypeList;
