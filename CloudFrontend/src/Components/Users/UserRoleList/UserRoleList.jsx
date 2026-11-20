import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import axios from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchUserRole } from "../../../Redux/Reducers/userRoleReduser"
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import * as XLSX from 'xlsx';
const UserRoleList = () => {
  const [rows, setRows] = useState([]);
  const dispatch = useDispatch()
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const UserDetial = useSelector((state) => state.LoginerReducer.userDetail)
  const [deleteR, setdeleteR] = useState(false)
  const [editR, setEditR] = useState(false)
  const pageName = "List User Role"
  const DeleteRight = "Delete User Role"
  const EditRight = "Edit User Role"
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const [loading, setLoading] = useState(false);

  //console.log(UserDetial)
  const getData = async () => {
    setLoading(true);

    try {
      const data = await getDataFundtion(`/userRole?pageName=${pageName}&role=${UserDetial.selectRole}`)
      const list = data.data
      //console.log(list)
      dispatch(fetchUserRole(list))
      setRows(list)
      setLoading(false);

    } catch (err) {
      //console.log(err)
    }
  }
  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == DeleteRight)
    const allowEdit = await UserRihts.find((item) => item == EditRight)
    if (allowEdit) {
      setEditR(true)
    }
    if (allowAcess) {
      setdeleteR(true)
    }
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (!viweAcess) {
      navigate("/")
    }
  }
  useEffect(() => {
    //checkAcess()
    getData()
  }, [])


  const handleEditClick = (id) => {
    if (editR){

      navigate(`/userRoleEdit/${id}`)
    }else{
            navigate(`/userRoleEdit/${id}`)
    }
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    //console.log(deleteR)
    if (deleteR) {
      try {
        const delete1 = await deleteDataFunction(`/userRole/DeleteRole/${selectedId}`)
        toast.success("Data Delete")
        setRows(rows.filter((row) => row._id !== selectedId));
      } catch (err) {
        if(err.status == 400){
        return toast.error(err.response.data)
        }
        toast.error("Something went wrong")
      }

    } else {
      toast.error("Access Denied")
    }
  };

  const columns = [
    {
      field: 'RoleName',
      headerName: 'Role Name',
      width: 350,
    },
    {
      field: 'Roles',
      headerName: 'Number of Roles',
      width: 150,
      // 👇 Display the count instead of array
      valueGetter: (value) => (Array.isArray(value) ? value.length : 0),
    },
    {
      field: 'createdBy',
      headerName: 'Created By',
      width: 150,
    },
    {
      field: 'createDate',
      headerName: 'Create Date',
      width: 150,
    },
    {
      field: 'updatedBy',
      headerName: 'Updated By',
      width: 150,
    },
    {
      field: 'updateDate',
      headerName: 'Updated Date',
      width: 150,
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

  const exportToExcel = () => {
    // Flatten roles data: one row per permission per role
    const excelData = [];
    rows.forEach((role) => {
      if (role.Roles && role.Roles.length > 0) {
        role.Roles.forEach((permission) => {
          excelData.push({
            "Role Name": role.RoleName,
            "Permission / Right": permission,
          });
        });
      } else {
        // Role with no permissions
        excelData.push({
          "Role Name": role.RoleName,
          "Permission / Right": "(No permissions assigned)",
        });
      }
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UserRoles");

    // Auto-size columns
    const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
      wch: Math.max(key.length, ...excelData.map((row) => String(row[key] || '').length)) + 2,
    }));
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `UserRoles_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (

    <div className="pd-page">
      <div className="pd-card pd-list-grid p-2">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>User Roles</h2>
        <Button
          variant="contained"
          color="success"
          startIcon={<FileDownloadIcon />}
          onClick={exportToExcel}
          disabled={rows.length === 0}
        >
          Download Excel
        </Button>
      </div>
      <ToastContainer />
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
    </div>
  )
}

export default UserRoleList