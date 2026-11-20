import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import { fetchVendor } from "../../Redux/Reducers/VendorReducer"
import { fetchPurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { fetchSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchStore } from '../../Redux/Reducers/StoreReducer';
import { fetchLocation } from '../../Redux/Reducers/LocationReducer';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import { fetchOpeningInvoices } from '../../Redux/Reducers/OpeningInvoicesReducer';
import { useLoader } from '../../hooks/useLoader';
import { fetchRemaininginvoice } from '../../Redux/Reducers/Remaininginvoice';
const SalesInvoiceList = () => {

  const { loading, showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [pageSize, setPageSize] = useState(100);
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [deleteR, setdeleteR] = useState(false)
  // const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0); // MUI uses 0-based pages


  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const category = useSelector((state) => state.Category.category)
  const Client = useSelector((state) => state.Client.client)
  const Products = useSelector((state) => state.Product.product);
  const location = useSelector((state) => state.Location.Location)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const Store = useSelector((state) => state.Store.Store)
  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const invoices = useSelector((state) => state.SalesInvoice.SalesInvoice)
  const AllProduct = useSelector((state) => state.TotalProducts.TotalProducts)
  const editOpeningInvoices = useSelector((state) => state.OpeningInvoices.OpeningInvoices);

  const getData = async () => {
    //console.log("first");
    const id = "687e14a624a274d5e844be49"
    showLoader("Loading Sales Invoices...");
    try {
      updateProgress(25);
      if (invoices.length == 0) {
        const response = await getDataFundtion(`/SaleInvoice`);
        dispatch(fetchSalesInvoice(response.data));
        const list = response.data
        //console.log(response, "response")
        const sortedInvoice = [...list].sort((a, b) => a.SalesInvoice - b.SalesInvoice)
        dispatch(fetchSalesInvoice(sortedInvoice));
        setRows(response.data);

      }
      else {
        setRows(invoices);
      }

      updateProgress(50);
      const product = await getDataFundtion("/product/getProductNameId");
      dispatch(fetchproduct(product.data));

      if (Client.length == 0) {
        const client = await getDataFundtion("/customer");
        dispatch(fetchClient(client.data));
      }
      if (OrderBooker.length == 0) {
        const orderBooker = await getDataFundtion("/OrderBooker");
        dispatch(fetchOrderBooker(orderBooker.data));
      }
      if (Store.length == 0) {
        const store = await getDataFundtion("/store");
        dispatch(fetchStore(store.data));
      }
      if (location.length == 0) {
        const Location = await getDataFundtion('/Location')
        dispatch(fetchLocation(Location.data))
      }
      const Reamin = await getDataFundtion("/saleInvoice/getOnlyRemainInvoiceAmount")
      dispatch(fetchRemaininginvoice(Reamin.data))
      //console.log(Reamin, 'remain');
      
      const res = await getDataFundtion(`/Administrative/get/${id}`)
      const adminData = res.data
      dispatch(fetchAdminReducer(adminData))
      updateProgress(75);

      if (AllProduct.length == 0) {
        const product = await getDataFundtion("/TotalProduct");
        dispatch(fetchTotalProducts(product.data));
      }
      if (editOpeningInvoices.length == 0) {
        const OpeningInvoice = await getDataFundtion("/OpeningInvoice")
        dispatch(fetchOpeningInvoices(OpeningInvoice.data));
      }

      updateProgress(100);
      setTimeout(hideLoader, 500);
    } catch (err) {
      //console.log(err);
    } finally {
      hideLoader();
    }


  };

  const getAllSaleInvoice = async () => {
    const res = await getDataFundtion("/saleInvoice")
    //console.log("first")
    const list = res.data
    //console.log(res)
    setRows(list);

  }

  const getCustomers = (id) => {
    const customers = useSelector((state) => state.customers.list);
    const found = customers.find((c) => c._id === id);
    return found ? found : null;
  };

  const DeleteRight = "Delete Sales"
  const EditRight = "Edit Sales"
  const pageName = "List Sales"
  const DeleteSales = UserRihts.find((item) => item == DeleteRight)
  const EditSales = UserRihts.find((item) => item == EditRight)
  const checkAcess = async () => {
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (!viweAcess) {
      navigate("/")
    }
  }
  useEffect(() => {
    //console.log("useEffect triggered", page, pageSize);
    checkAcess();
    getData();
  }, [page, pageSize]);
  const handleEditClick = (id) => {
    const isPost = rows.find((item) => item._id == id).PostStatus
    if (isPost == true) {
      return toast.error('first unpost for edit')
    }
    else {
      navigate(`/SalesInvoiceEdit/${id}`)

    }

  };
  const handleViewClick = (id) => {
    navigate(`/SalesInvoiceView/${id}`)
  }
  const handleDeleteClick = (id) => {
    const isPost = rows.find((item) => item._id == id).PostStatus
    if (isPost == true) {
      return toast.error('first unpost for delete')
    }
    else {

      setSelectedId(id);
      setOpenDeleteDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    if (!deleteR) {
      toast.error("Access Denied")
      return
    }
    setRows(rows.filter((row) => row._id !== selectedId));
    deleteDataFunction(`/SaleInvoice/SaleInvoiceDelete/${selectedId}`)

  }
    ;
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };
  const columns = [
    {
      field: 'SalesInvoiceDate',
      headerName: 'Invoice Date',
      width: 200,
      renderCell: (params) => formatDate(params.value), // Use .value
    },
    {
      field: 'SalesInvoice',
      headerName: 'Invoice #',
      width: 200,
    },
    {
      field: 'SalesFlowRef',
      headerName: 'Sales Flow Ref',
      width: 150,
    },
    {
      field: 'Store',
      headerName: 'Store',
      width: 150,
    },
    {
      field: 'ClientDetails',
      headerName: 'Client',
      width: 300,
      renderCell: (params) => {
        const customer = params.value;
        return customer ? customer.CutomerName : 'Client Not Found';
      },
    }
    ,
    {
      field: 'Total Products',
      headerName: 'Total Products',
      width: 80,
      renderCell: (params) => params?.row?.SalesData?.length || 0,
    },
    {
      field: 'Total Gst',
      headerName: 'Total GST',
      width: 120,
      renderCell: (params) =>
        params.row.SalesData?.reduce((sum, item) => sum + Number(item.Gst), 0).toFixed(2)
    },
    {
      field: 'NetAmount',
      headerName: 'Net Amount',
      width: 120,
      renderCell: (params) =>
        params.row.SalesData?.reduce((sum, item) => sum + Number(item.netAmunt), 0).toFixed(2)
    },
    {
      field: 'PostStatus',
      headerName: 'status',
      width: 80,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      getActions: ({ id }) => [
        <GridActionsCellItem
          icon={<VisibilityIcon />}
          label="View"
          onClick={() => handleViewClick(id)}
          color="view"
        />,
        ...(EditSales ? [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEditClick(id)}
          />,
        ] : []),
        ...(DeleteSales ? [
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="Delete"
            onClick={() => handleDeleteClick(id)}
            color="error"
          />,
        ] : []),
      ],
    },
  ];
  const check = (num) => {
    //console.log(num)
  }
  return (

    <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
      <LoaderComponent />
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={[5]}
        getRowId={(row) => row._id}
        disableSelectionOnClick
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

export default SalesInvoiceList