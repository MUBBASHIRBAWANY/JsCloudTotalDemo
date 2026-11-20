import axios from 'axios';
import { use, useEffect, useState } from 'react';
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
import { deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { fetchVendor } from "../../Redux/Reducers/VendorReducer"
import { fetchPurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { fetchSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchStore } from '../../Redux/Reducers/StoreReducer';
import { fetchLocation } from '../../Redux/Reducers/LocationReducer';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import { fetchOrderDc } from '../../Redux/Reducers/OrderDCReducer';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';
import { filterByAssignedDistributors } from '../Global/distributorAccess';

const SalesInvoiceList = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [pageSize, setPageSize] = useState(100);
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const SalesInvoice = useSelector((state) => state.SalesInvoice.SalesInvoice)
  const product = useSelector((state) => state.Product.product);
  const Client = useSelector((state) => state.Client.client)
  const Store = useSelector((state) => state.Store.Store)
  const location = useSelector((state) => state.Location.Location)
  const OrderDc = useSelector((state) => state.OrderDc.OrderDc)
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail)



  const getData = async () => {
    setLoading(true);
    try {
      if (Client.length == 0) {
        const customer = await getDataFundtion("/Customor");
        dispatch(fetchClient(customer.data));
      }
      if (Store.length == 0) {
        const store = await getDataFundtion("/store");
        dispatch(fetchStore(store.data));
      }
      if (OrderBooker.length == 0) {
        const orderBooker = await getDataFundtion("/OrderBooker");
        dispatch(fetchOrderBooker(orderBooker.data));
      }
   
      if (Admin.length == 0) {
        const AdminiD = "68903ec2664155e11db10367"
        const res = await getDataFundtion(`/Administrative/get/${AdminiD}`)
        dispatch(fetchAdminReducer(res.data))
      }
      if (SalesInvoice.length == 0) {
        const response = await getDataFundtion(`/SaleInvoice/getLimitedSaleInvoice`);
        const list = response.data;
        // const sortedInvoice = [...list].sort((a, b) => a.SalesInvoice  
        dispatch(fetchSalesInvoice(list));
      }
      if (product.length == 0) {
        const product = await getDataFundtion("/product");
        dispatch(fetchproduct(product.data));
      }
      if (location.length == 0) {
        const Location = await getDataFundtion('/Location')
        dispatch(fetchLocation(Location.data))
      }
      if(OrderDc.length == 0){
        const onTrueDc = await getDataFundtion("DcOrder/OnlyTrue")
        console.log(onTrueDc)
        dispatch(fetchOrderDc(onTrueDc.data))
      }
      if (Accounts.length == 0) {
        const Accounts = await getDataFundtion('/ChartofAccounts')
        dispatch(fetchChartofAccounts(Accounts.data))
      }

    } catch (err) {
      console.log(err);
    }
    setLoading(false);

  };

useEffect(() => { 
  setRows(filterByAssignedDistributors(SalesInvoice, loginuser, (item) => item.Distrbutor))
}, [SalesInvoice, loginuser])

  const getAllSaleInvoice = async () => {
    const res = await getDataFundtion("/saleInvoice")
    console.log("first")
    const list = res.data
    console.log(res)
    const sortedInvoice = [...list].sort((a, b) => a.SalesInvoice - b.SalesInvoice)
    dispatch(fetchSalesInvoice(sortedInvoice));


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
    console.log("useEffect triggered", page, pageSize);
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

    await deleteDataFunction(`/SaleInvoice/SaleInvoiceDelete/${selectedId}`)
    setRows(rows.filter((row) => row._id !== selectedId));

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
      field: 'Store',
      headerName: 'Store',
      width: 100,
      renderCell: (params) => {
        const Store1 = Store.find(Store => Store._id === params.value);
        return Store1 ? `${Store1.StoreName} (${Store1.code})` : 'Store Not Found';
      },

    },
    {
      field: 'Client',
      headerName: 'Client',
      width: 300,
      renderCell: (params) => {
        const vendor1 = Client.find(vendor => vendor._id === params.value);
        return vendor1 ? `${vendor1.CutomerName} (${vendor1.code})` : 'Vendor Not Found';
      },
    },
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
        params.row.SalesData?.reduce((sum, item) => sum + Number(item.Gst)|| 0 , 0).toFixed(2) 
    },
    {
      field: 'TotalAmount',
      headerName: 'Net Amount',
      width: 120,
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
  const check = (num) => {
    console.log(num)
  }
  return (

    <div style={{ margin: 20, height: "70%", width: '80vw' }}>
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={[5]}
        loading={loading}
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
    </div>
  )
}

export default SalesInvoiceList