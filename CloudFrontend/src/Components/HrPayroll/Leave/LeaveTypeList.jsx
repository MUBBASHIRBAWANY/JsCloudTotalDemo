import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchLeaveType } from '../../../Redux/Reducers/LeaveReducer';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const LeaveTypeList = () => {
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const getData = async () => {
    const data = await getDataFundtion("HrLeaveType/");
    const list = data.data;
    dispatch(fetchLeaveType(list));
    setRows(list);
  };

  useEffect(() => { getData(); }, []);

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true); };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/HrLeaveType/${selectedId}`);
    setRows(rows.filter((row) => row._id !== selectedId));
    toast.success("Deleted");
  };

  const columns = [
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'maxDays', headerName: 'Max Days', width: 120, type: 'number' },
    { field: 'gender', headerName: 'Gender', width: 120 },
    { field: 'active', headerName: 'Active', width: 100, valueFormatter: (v) => v ? 'Yes' : 'No' },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 120,
      getActions: (params) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => navigate(`/LeaveTypeEdit/${params.row._id}`)} />,
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
        <DialogTitle>Delete Leave Type?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default LeaveTypeList;
