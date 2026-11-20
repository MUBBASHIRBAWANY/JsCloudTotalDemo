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
import { deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchSalesInvoiceReturn } from '../../Redux/Reducers/SalesInvoiceReturnReducer';
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';

const SalesInvoiceReturnList = () => {
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
  const category = useSelector((state) => state.Category.category)
  const Client = useSelector((state) => state.Client.client)
  const SalesInvoiceReturn = useSelector((state) => state.SalesInvoiceReturn.SalesInvoiceReturn);
  console.log(SalesInvoiceReturn)
    const Prod = useSelector((state) => state.Product.product);
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)

  const getData = async () => {
    setLoading(true);
    try {
      
        console.log("first");
        const response = await getDataFundtion(`/SalesInvoiceReturn?page=${page + 1}&limit=${pageSize}`);
        console.log(response)
        dispatch(fetchSalesInvoiceReturn(response.data));
      
      if(Client.length < 1 ){
        const customer = await getDataFundtion("/Customor");
        dispatch(fetchClient(customer.data));
        
      }
      if(Prod.length < 1){
        const product = await getDataFundtion("/product");
        dispatch(fetchproduct(product.data));

      }
      if(Accounts.length < 1){
        const Accounts = await getDataFundtion("/ChartofAccounts")
        dispatch(fetchChartofAccounts(Accounts.data))

      }
      if(OrderBooker.length < 1){
        const orderBooker = await getDataFundtion("/OrderBooker");
        dispatch(fetchOrderBooker(orderBooker.data));
        
      }

    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  useEffect(()=>{
    setRows(SalesInvoiceReturn)
    
  },[SalesInvoiceReturn])
  const Store = useSelector((state) => state.Store.Store)


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
    getData();
  }, []);
  const handleEditClick = (id) => {
    const isPost = rows.find((item) => item._id == id).PostStatus
    if (isPost == true) {
      return toast.error('first unpost for edit')
    }
    else {
      navigate(`/SalesInvoiceReturnEdit/${id}`)

    }

  };
  const handleViewClick = (id) => {
    navigate(`/SalesReturnInvoiceView/${id}`)
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

    setRows(rows.filter((row) => row._id !== selectedId));
    deleteDataFunction(`/SalesInvoiceReturn/SaleInvoiceDelete/${selectedId}`)

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
      field: 'SalesInvoiceReturnDate',
      headerName: 'Sales Return Date',
      width: 200,
      renderCell: (params) => formatDate(params.value), // Use .value
    },
    {
      field: 'SalesReturnNumber',
      headerName: 'SalesReturnNumber',
      width: 200,
    },
    {
      field: 'Client',
      headerName: 'Client',
      width: 200,
      renderCell: (params) => {
        const vendor1 = Client.find(vendor => vendor._id === params.value);
        return vendor1 ? `${vendor1.CutomerName} (${vendor1.code})` : 'Vendor Not Found';
      },
    },
    {
      field: 'Total Products',
      headerName: 'Total Products',
      width: 250,
      renderCell: (params) => params?.row?.SalesReturnData?.length || 0,
    },
    {
      field: 'Total Gst',
      headerName: 'Total GST',
      width: 250,
      renderCell: (params) =>
        params.row.SalesReturnData?.reduce((sum, item) => sum + Number(item.Gst) || 0, 0).toFixed(2)
    },
    {
      field: 'NetAmount',
      headerName: 'Net Amount',
      width: 250,
      renderCell: (params) =>
        params.row.SalesReturnData?.reduce((sum, item) => sum + Number(item.netAmunt), 0).toFixed(2)
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
      field: 'PostStatus',
      headerName: 'status',
      width: 100,
    },

    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 130,
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

export default SalesInvoiceReturnList