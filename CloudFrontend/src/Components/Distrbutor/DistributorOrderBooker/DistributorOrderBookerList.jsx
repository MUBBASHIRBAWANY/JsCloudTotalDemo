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
import { fetchDistributorOrderBooker } from '../../../Redux/Reducers/DistributorOrderBookerReducer';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';

const DistributorOrderBookerList = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
    const Region = useSelector((state) => state.Region.Region)
  
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const [deleteR, setdeleteR] = useState(false)
  const getData = async () => {
    try {
      const data = await getDataFundtion("/DitriButorOrderBooker")
      const Region = await getDataFundtion("/Region")
      dispatch(fetchRegion(Region.data))
      dispatch(fetchDistributorOrderBooker(data.data))

      const list = data.data


      setRows(list)
    } catch (err) {
      //console.log(err)
    }

  }

  useEffect(() => {
    getData()
  }, [])

  const handleEditClick = (id) => {
    //console.log(id)
    navigate(`/OrderBookerEdit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);

    setRows(rows.filter((row) => row._id !== selectedId));
    deleteDataFunction(`/OrderBooker/deleteOrderBooker/${selectedId}`)

  };
  const columns = [

    { field: 'masterCode', headerName: 'Master Code', width: 250, },
    { field: 'code', headerName: 'Order Booker Code', width: 250, },
    { field: 'OrderBookerName', headerName: 'Name', width: 450, },
    { field: 'salesFlowRef', headerName: 'Sales Flow Ref', width: 250, },

    {
      field: 'Region', headerName: 'Region', width: 200, renderCell: (params) => {
        const Region1 = Region.find(Region => Region._id == params.formattedValue);
        return Region1 ? `${Region1.RegionName} (${Region1.code})` : 'No Master Sku';
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

    <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
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
    </div></div>
  )
}

export default DistributorOrderBookerList