import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { fetchGroup } from '../../../Redux/Reducers/GroupReducer';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';


const RegionList = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const [loading, setLoading] = useState(false);

  const getData = async () => {
    setLoading(true)
    try {
      const data = await getDataFundtion("/Region")
      const Group = await getDataFundtion("/Group")
      dispatch(fetchGroup(Group.data))
      const list = data.data
      dispatch(fetchRegion(list))
      const realdata = list.map((item) => ({
        code: item.code,
        _id: item._id,
        RegionName: item.RegionName,
        Group: Group.data.find((z) => z._id === item.Group).GroupName
      }))
      setLoading(false)
      setRows(realdata)
    } catch (err) {
      //console.log(err)
    }

  }

  useEffect(() => {


    getData()
  }, [])

  const handleEditClick = (id) => {
    //console.log(id)
    navigate(`/Regionedit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    try {
      await deleteDataFunction(`/Region/deleteRegion/${selectedId}`)
      toast.success("Data Delete")
      setRows(rows.filter((row) => row._id !== selectedId));
    }
    catch (err) {
      if (err.status == 400) {
        return toast.error(err.response.data)
      }
      toast.error("Something went wrong")

    }

  };
  const columns = [
    { field: 'code', headerName: 'Region Code', width: 250, },
    { field: 'RegionName', headerName: 'Region', width: 450, },
    { field: 'Group', headerName: 'Group', width: 450, },
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

    <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
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
    </div></div>
  )
}

export default RegionList