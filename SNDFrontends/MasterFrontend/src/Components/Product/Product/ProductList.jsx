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
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { fetchMasterSku } from '../../../Redux/Reducers/MasterSkuReducer';
import { fetchbrand } from '../../../Redux/Reducers/BrandRecducer';
import { fetchCategory } from '../../../Redux/Reducers/CategoryReducer';
import { fetchVendor } from '../../../Redux/Reducers/VendorReducer';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CurdFunctions';
import ExcelExport from '../../Global/ExcalData';
const ProductList = () => {
  const DeleteRight = "Delete SKU"
  const pageName = "List SKU"
  const [rows, setRows] = useState();
  const dispatch = useDispatch()
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [msku, setMSku] = useState([])
  const [cat, setCat] = useState([])
  const [prBrand, setprBrand] = useState([])
  const [prVendor, setPrVendor] = useState([])
  const navigate = useNavigate()
  const [deleteR, setdeleteR] = useState(false)
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const Vendor = useSelector((state) => state.Vendor.state)
  const Category = useSelector((state) => state.Category.category)
  const [loading, setLoading] = useState(false);




  const getData = async () => {
    setLoading(true)
    const data = await getDataFundtion("/product")
    setRows(data.data)
    dispatch(fetchproduct(data.data))
    setLoading(false)

  }

  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == DeleteRight)
    console.log(allowAcess)
    if (allowAcess) {
      setdeleteR(true)
    }
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (!viweAcess) {
      navigate("/")
    }
  }
  useEffect(() => {
   // checkAcess()
    getData()
  }, [])
  const handleEditClick = (id) => {
    console.log(id)
    navigate(`/Productedit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    if (deleteR) {
      try {
        await deleteDataFunction(`/product/deleteProduct/${selectedId}`)
        setRows(rows.filter((row) => row._id !== selectedId));
      } catch (err) {
        if (err.status == 400) {
          toast.error(err.response.data)
        }
      }
    }
    else {
      toast.error("Access Denied")
    }
  };

  const initialState = {
    columns: {
      columnVisibilityModel: {
        SalesRate: false,
        SaleTaxPercent: false
      },
    },
  };
  const columns = [

    { field: 'code', headerName: 'Product code', width: 150, },
    { field: 'ProductName', headerName: 'Product Name', width: 200, },
    { field: 'RetailPrice', headerName: 'Retail Price', width: 150, hide: true },
    { field: 'BoxinCarton', headerName: 'Box in Carton', width: 150, },
    { field: 'PcsinBox', headerName: 'Pcs in Box', width: 150, },
    
    
    
  ];
  console.log(columns)
  return (
    <div style={{ margin: 20, height: "70%", width: '80vw' }}>
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        initialState={initialState}
        loading={loading}
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

export default ProductList