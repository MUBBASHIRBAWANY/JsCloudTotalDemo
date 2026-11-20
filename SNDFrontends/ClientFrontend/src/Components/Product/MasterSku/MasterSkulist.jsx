import axios from 'axios';
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
import { fetchMasterSku } from '../../../Redux/Reducers/MasterSkuReducer';
import { toast, ToastContainer } from 'react-toastify';
import { fetchCategory } from '../../../Redux/Reducers/CategoryReducer';
import { fetchbrand } from '../../../Redux/Reducers/BrandRecducer';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CurdFunctions';


const MasterSkulist = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [deleteR, setdeleteR] = useState(false)
  const Brand = useSelector((state) => state.Brand.brand)
  const Category = useSelector((state) => state.Category.category)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const DeleteRight = "MasterSkuDelete"
  const pageName = "MasterSkuList"
  const [loading, setLoading] = useState(false);
  const getData = async () => {
    setLoading(true)
    try {
      const data = await getDataFundtion("MasterSku")
      const category = await getDataFundtion("Category")
      const brand = await getDataFundtion("Brand/")
      console.log(data)
      const list = data.data
      dispatch(fetchMasterSku(list))
      dispatch(fetchCategory(category.data))
      dispatch(fetchbrand(brand.data))
      setRows(list)
      setLoading(false)
    } catch (err) {
      console.log(err)
    }

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
    //checkAcess()
    getData()
  }, [])
  const handleEditClick = (id) => {
    console.log(id)
    navigate(`/masterskuedit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    if (deleteR) {
      const productByMsku = await getDataFundtion(`/product/getProductByMsku/${selectedId}`)
      if (productByMsku.data.length === 0) {
        setRows(rows.filter((row) => row._id !== selectedId));
        deleteDataFunction(`/MasterSku/deleteMasterSku/${selectedId}`)
      }
      else {
        console.log()
        toast.error(`this master sku is used in sku ${productByMsku.data[0].ProductName}`)
      }

    }
    else {
      toast.error("Access Denied")
    }
  };
  const columns = [
    { field: 'mastercode', headerName: 'Master Code', width: 150, },
    { field: 'code', headerName: 'MskuCode', width: 150, },
    { field: 'MasterSkuName', headerName: 'Master Sku Name', width: 300, },

    {
      field: 'Brand', headerName: 'Brand', width: 200, renderCell: (params) => {
        const brand1 = Brand.find(vendor => vendor._id == params.formattedValue);
        return brand1 ? `${brand1.BrandName} (${brand1.code})` : 'No Master Sku';
      }
    },
    {
      field: 'Category',
      headerName: 'Category',
      width: 200,
      renderCell: (params) => {
        const mastercode = params.row.mastercode || '';
        const CategoryCode = mastercode.slice(0, 4);
        const Categor1 = Category.find(Category => Category.mastercode == CategoryCode);
        return Categor1 ? `${Categor1.CategoryName} (${Categor1.code})` : 'No Vendor';
      }
    },
  ];

  return (
    <div style={{ margin: 20, height: "70%", width: '80vw'}}>
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
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

export default MasterSkulist