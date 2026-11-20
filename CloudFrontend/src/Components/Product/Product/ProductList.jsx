import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { fetchMasterSku } from '../../../Redux/Reducers/MasterSkuReducer';
import { fetchbrand } from '../../../Redux/Reducers/BrandRecducer';
import { fetchCategory } from '../../../Redux/Reducers/CategoryReducer';
import { fetchVendor } from '../../../Redux/Reducers/VendorReducer';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import ExcelExport from '../../Global/ExcalData';
const ProductList = () => {
  const DeleteRight = "ProductDelete"
  const pageName = "ProductList"
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
  const Brand = useSelector((state) => state.Brand.brand)






  const downlaodExcel = (data) => {

    const allData = data.map((item, index) => {

      const mastercode = item.mastercode || '';
      const vendorCode = mastercode.slice(0, 2);
      const Vendor1 = Vendor.find(v => v.code == vendorCode);
      const MasterSKu = msku.find(msku => msku._id == item.MasterSKu);

      return {
        ...item,
        VendorName: `${Vendor1.VendorName} (${Vendor1.code})` || '',
        MasterSKu,
        _id: index + 1
      };

    });
//console.log(allData)
    const worksheet = XLSX.utils.json_to_sheet(allData);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Store Summary");

    XLSX.writeFile(workbook, "Store_Pie_Data.xlsx");
  };



  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == DeleteRight)
    //console.log(allowAcess)
    if (allowAcess) {
      setdeleteR(true)
    }
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (!viweAcess) {
      navigate("/")
    }
  }

  const getData = async () => {
    const data = await getDataFundtion("product")
    const mastersku = await getDataFundtion("masterSku/")
    const category = await getDataFundtion("Category")
    const brand = await getDataFundtion("Brand/")
    const vendor = await getDataFundtion("vendor/")
    setRows(data.data)
    setMSku(mastersku.data)
    setCat(category.data)
    setprBrand(brand.data)
    setPrVendor(vendor.data)
    dispatch(fetchproduct(data.data))
    dispatch(fetchMasterSku(mastersku.data))
    dispatch(fetchCategory(category.data))
    dispatch(fetchbrand(brand.data))
    dispatch(fetchVendor(vendor.data))

  }

  useEffect(() => {
    //checkAcess()
    getData()
  }, [])
  const handleEditClick = (id) => {
    //console.log(id)
    navigate(`/Productedit/${id}`)
  };

  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    setOpenDeleteDialog(false);
    if (deleteR) {
      setRows(rows.filter((row) => row._id !== selectedId));
      deleteDataFunction(`/product/deleteProduct/${selectedId}`)
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
    {
      field: 'mastercode', headerName: 'Master code', width: 150, renderCell: (params) => {
        return params.formattedValue.slice(0, 8)
      }
    },
    { field: 'code', headerName: 'Product code', width: 150, },
    { field: 'salesFlowRef', headerName: 'Sales Flow Ref', width: 200, },
    { field: 'ProductName', headerName: 'Product Name', width: 200, },
    { field: 'OpeningRate', headerName: 'Opening Rate', width: 100, },
    { field: 'TPPurchase', headerName: 'TP Purchase', width: 100, },
    { field: 'PurchaseDiscountPer', headerName: 'Purchase Discount Per', width: 170 },
    { field: 'TPSale', headerName: 'TP Sale', width: 100, hide: true },
    { field: 'RetailPrice', headerName: 'Retail Price', width: 100, hide: true },
    { field: 'SaleTaxPercent', headerName: 'Sale Tax Percent', width: 100, hide: true },
    { field: 'BoxinCarton', headerName: 'Box in Carton', width: 100, },
    { field: 'PcsinBox', headerName: 'Pcs in Box', width: 100, },
    {
      field: 'SaleTaxBy', headerName: 'Sale Tax By', width: 100, renderCell: (params) => {
        return params.value == 1 ? "By Amount" : "By Rate";
      }
    },



    {
      field: 'vendor',
      headerName: 'Vendor',
      width: 150,
      renderCell: (params) => {
        const mastercode = params.row.mastercode || '';
        const vendorCode = mastercode.slice(0, 2);
        const Vendor1 = Vendor.find(Vendor => Vendor.code == vendorCode);
        return Vendor1 ? `${Vendor1.VendorName} (${Vendor1.code})` : 'No Vendor';
      }
    },
    {
      field: 'MasterSKu', headerName: 'Master SKu', width: 150, renderCell: (params) => {
        const MasterSKu = msku.find(msku => msku._id == params.formattedValue);
        return MasterSKu ? `${MasterSKu.MasterSkuName} (${MasterSKu.code})` : 'No Master Sku';
      }
    },

    {
      field: 'Category',
      headerName: 'Category',
      width: 150,
      renderCell: (params) => {
        const mastercode = params.row.mastercode || '';
        const CategoryCode = mastercode.slice(0, 4);
        const Categor1 = Category.find(Category => Category.mastercode == CategoryCode);
        return Categor1 ? `${Categor1.CategoryName} (${Categor1.code})` : 'No Vendor';
      }
    },
    {
      field: 'Brand',
      headerName: 'Brand',
      width: 200,
      renderCell: (params) => {
        const mastercode = params.row.mastercode || '';
        const Brand1 = mastercode.slice(0, 6);
        const Categor1 = Brand.find(Brand => Brand.mastercode == Brand1);
        return Categor1 ? `${Categor1.BrandName} (${Categor1.code})` : 'No Vendor';
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
  //console.log(columns)
  return (
    <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
      <button type='button' className="pd-btn-save" onClick={()=>downlaodExcel(rows)} >
        Export to Excel
      </button>
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        initialState={initialState}
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

export default ProductList