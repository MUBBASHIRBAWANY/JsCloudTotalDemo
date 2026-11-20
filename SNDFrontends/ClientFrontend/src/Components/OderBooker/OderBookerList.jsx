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
import { deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchRegion } from '../../Redux/Reducers/RegionReducer';

const OderBookerList = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [Region, setRegion] = useState()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const currentUser = useSelector((state) => state.LoginerReducer.userDetail);

  const [deleteR, setdeleteR] = useState(false)
  const [loading, setLoading] = useState(false);

  const getData = async () => {
    setLoading(true)
    try {
      const data = await getDataFundtion(`/orderbooker/OrderByvendor/${currentUser._id}`)
      const list = data.data
      dispatch(fetchOrderBooker(list))

      setRows(list)
      setLoading(false)

    } catch (err) {
      console.log(err)
    }

  }

  useEffect(() => {
    getData()
  }, [])

  const handleEditClick = (id) => {
    console.log(id)
    navigate(`/OrderBookerEdit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    try {
      setOpenDeleteDialog(false);
      await deleteDataFunction(`/OrderBooker/deleteOrderBooker/${selectedId}`)
      setRows(rows.filter((row) => row._id !== selectedId));
    }
    catch (err) {
      if (err.status == 400) {
        console.log(err)
        return toast.error(err.response.data)
      }
      toast.error("Some Thing Went Wrong")
    }

  };
  const columns = [

    { field: 'code', headerName: 'Order Booker Code', width: 250, },
    { field: 'OrderBookerName', headerName: 'Name', width: 450, },

    {
      field: 'Region', headerName: 'Region', width: 200, renderCell: (params) => {
        const Region1 = Region?.find(Region => Region?._id == params?.formattedValue);
        return Region1 ? `${Region1?.RegionName} (${Region1?.code})` : 'No Region Found';
      }
    },

  ];

  return (

    <div style={{ margin: 20, height: "70%", width: '80vw' }}>
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
    </div>
  )
}

export default OderBookerList