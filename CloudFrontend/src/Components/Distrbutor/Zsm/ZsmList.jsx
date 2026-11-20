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
import { fetchZsm } from '../../../Redux/Reducers/ZsmReducer';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';

const ZsmList = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const Zone = useSelector((state) => state.Zone.zone)

  const navigate = useNavigate()
  const dispatch = useDispatch()

  const getData = async () => {
    try {
      const data = await getDataFundtion("/Zsm")
      const Zone = await getDataFundtion("/Zone")
      
      dispatch(fetchZone(Zone.data))
      dispatch(fetchZsm(data.data))

      const list = data.data
      setRows(list)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    getData()
  }, [])

  const handleEditClick = (id) => {
    navigate(`/ZsmEdit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    setRows(rows.filter((row) => row._id !== selectedId));
    deleteDataFunction(`/Zsm/deleteZsm/${selectedId}`)
  };

  const columns = [
    { field: 'masterCode', headerName: 'Master Code', width: 250 },
    { field: 'code', headerName: 'ZSM Code', width: 250 },
    { field: 'ZsmName', headerName: 'Name', width: 450 },
    { field: 'salesFlowRef', headerName: 'Sales Flow Ref', width: 250 },
    {
      field: 'Zone', headerName: 'Zone', width: 200, renderCell: (params) => {
        const Zone1 = Zone.find(Zone => Zone._id == params.formattedValue);
        return Zone1 ? `${Zone1.ZoneName} (${Zone1.code})` : '—';
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
      <div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
        <ToastContainer />
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
  )
}

export default ZsmList
