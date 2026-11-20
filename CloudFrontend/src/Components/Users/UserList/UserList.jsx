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
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchLocation } from '../../../Redux/Reducers/LocationReducer';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchVendor } from '../../../Redux/Reducers/VendorReducer';

const userlist = () => {
  const [rows, setRows] = useState();
  const dispatch = useDispatch()
  const list1 = useSelector((state) => state.users1.state)
  const store = useSelector((state) => state.Store.Store)
  const Loction = useSelector((state) => state.Location.Location)

  const [roles, setRoles] = useState()

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const getData = async () => {
    const data = await getDataFundtion("/users")
    const RoleData = await getDataFundtion("/userRole")
    const location = await getDataFundtion("/Location")
    const Store = await getDataFundtion("/Store")
    const city = await getDataFundtion("/city")
    const vendor = await getDataFundtion("vendor/")
    const roleList = RoleData.data
    setRoles(roleList)
    dispatch(fetchVendor(vendor.data))
    dispatch(fetchCity(city.data))
    dispatch(fetchLocation(location.data))
    dispatch(fetchUserRole(roleList))
    dispatch(fetchStore(Store.data))
    const list = data.data
    dispatch(fetchUsers(list))
    setRows(list)
  }
  useEffect(() => {
    getData()
  }, [])

  const handleEditClick = (id) => {
    //console.log(id)
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
    { field: 'createdBy', headerName: 'Created By', width: 100, },
    { field: 'createDate', headerName: 'Create Date', width: 150, },
    { field: 'updatedBy', headerName: 'Updated By', width: 100, },
    { field: 'updateDate', headerName: 'Update Date', width: 150, },
    {
      field: 'selectRole', headerName: 'Role', width: 150, renderCell: (params) => {
        const userRole = roles?.find(role => role._id == params.formattedValue);
        return userRole ? userRole.RoleName : 'No Role Assigned';
      }
    },
    {
      field: 'Location', headerName: 'Location', width: 150, renderCell: (params) => {
        const Location = Loction.find(Loction => Loction._id == params.formattedValue);
        return Location ? Location.LocationName : 'No Location Assigned';
      }
    },
    {
      field: 'Store', headerName: 'Store', width: 150, renderCell: (params) => {
        const Store = store.find(Loction => Loction._id == params.formattedValue);
        return Store ? Store.StoreName : 'No Store Assigned';
      }
    },




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

    <div className="pd-page">
      <div className="pd-card pd-list-grid p-2">
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={5}
          getRowId={(row) => row._id}
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
    </div>

  );
}

export default userlist