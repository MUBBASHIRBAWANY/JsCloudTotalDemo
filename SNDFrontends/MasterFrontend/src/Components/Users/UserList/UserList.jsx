import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { fetchUsers } from '../../../Redux/Reducers/userReduser';
import { useNavigate } from 'react-router-dom';
import { fetchUserRole } from '../../../Redux/Reducers/userRoleReduser';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CurdFunctions';
import { fetchLocation } from '../../../Redux/Reducers/LocationReducer';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';

const userlist = () => {
  const [rows, setRows] = useState();
  const dispatch = useDispatch()
  const list1 = useSelector((state) => state.users1.state)
  const store = useSelector((state) => state.Store.Store)
  const Loction = useSelector((state) => state.Location.Location)
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const [loading, setLoading] = useState(false);

  const [roles, setRoles] = useState()

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const getData = async () => {
    const data = await getDataFundtion("/users")
    const Distrbutor = await getDataFundtion("/Distrbutor")
    
    dispatch(fetchDistributroReducers(Distrbutor))

    const list = data.data
    dispatch(fetchUsers(list))
    setRows(list)
    setLoading(false);
  }

  useEffect(() => {
    getData()
  }, [])

  const handleEditClick = (id) => {
    console.log(id)
    navigate(`/userEdit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    setRows(rows.filter((row) => row._id !== selectedId));
    setOpenDeleteDialog(false);
    deleteDataFunction(`/users/user/${selectedId}`)
  };

  const columns = [
    { field: 'firstname', headerName: 'First name', width: 150, },
    { field: 'lastname', headerName: 'Last name', width: 150, },
    { field: 'phoneNumber', headerName: 'Phone Number', width: 150, },
    {
      field: 'Vendor',
      headerName: 'Distributors',
      width: 280,
      renderCell: (params) => {
        const ids = params.row.Vendor || [];
        if (ids.some((item) => String(item).toLowerCase() === 'all')) return 'All';
        const names = ids
          .map((id) => (Distributors || []).find((d) => d._id === id)?.DistrbutorName || id)
          .filter(Boolean);
        return names.join(', ') || '-';
      },
    },
    { field: 'createdBy', headerName: 'Created By', width: 100, },
    { field: 'createDate', headerName: 'Create Date', width: 150, },
    { field: 'updatedBy', headerName: 'Updated By', width: 100, },
    { field: 'updateDate', headerName: 'Update Date', width: 150, },




    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 130,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<EditIcon />}
          label="Edit"
          onClick={() => handleEditClick(id)}
        />,
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={() => handleDeleteClick(id)}
          color="error"
        />,
      ],
    },
  ];

  return (

    <div style={{ margin: 20, height: "70%", width: '80vw' }}>
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        getRowId={(row) => row._id}
        loading={loading}
        rowsPerPageOptions={[5]}
        experimentalFeatures={{ newEditingApi: true }}
      />

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </div>

  );
}

export default userlist