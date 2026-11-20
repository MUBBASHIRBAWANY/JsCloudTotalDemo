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
import { fetchVendor } from '../../Redux/Reducers/VendorReducer';
import { deleteDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';

const OderBookerList = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [vendor, setVendor] = useState()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const [deleteR, setdeleteR] = useState(false)
  const getData = async () => {
    try {
      const data = await getDataFundtion("/OrderBooker")
      const vendor = await getDataFundtion("/vendor")
      setVendor(vendor.data)
      const list = data.data
   dispatch(fetchOrderBooker(list))
      dispatch(fetchVendor(vendor.data))
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
      field: 'Vendor', headerName: 'Vendor', width: 200, renderCell: (params) => {
        const vendor1 = vendor.find(vendor => vendor._id == params.formattedValue);
        return vendor1 ? `${vendor1.VendorName} (${vendor1.code})` : 'No Master Sku';
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

export default OderBookerList