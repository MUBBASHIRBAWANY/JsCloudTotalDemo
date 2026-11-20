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
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { fetchVendor } from "../../Redux/Reducers/VendorReducer"
import { fetchPurchaseInvoice } from '../../Redux/Reducers/PurchaseInvoiceReducer';
import { fetchLoadForm } from '../../Redux/Reducers/LoadFormReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchStore } from '../../Redux/Reducers/StoreReducer';
import { fetchLocation } from '../../Redux/Reducers/LocationReducer';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import { fetchOrderDc } from '../../Redux/Reducers/OrderDCReducer';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';

const idOf = (val) => {
  if (!val) return '';
  if (typeof val === 'object') return String(val._id || val.$oid || '');
  return String(val);
};

const LoadFormList = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [pageSize, setPageSize] = useState(100);
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0)
  const [allRows, setAllRows] = useState([])
  const [bookers, setBookers] = useState([])
  const [selectedOrderBooker, setSelectedOrderBooker] = useState('all')
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const LoadForm = useSelector((state) => state.LoadForm.LoadForm)
  const product = useSelector((state) => state.Product.product);
  const Client = useSelector((state) => state.Client.client)
  const Store = useSelector((state) => state.Store.Store)
  const location = useSelector((state) => state.Location.Location)
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)

  const getData = async () => {
    setLoading(true);
    try {
      if (Client.length == 0) {
        const customer = await getDataFundtion("/Customor");
        dispatch(fetchClient(customer.data));
      }

      const orderBooker = await getDataFundtion(`/orderbooker/OrderByvendor/${loginVendor._id}`);
      const bookerList = orderBooker.data || [];
      dispatch(fetchOrderBooker(bookerList));
      setBookers(bookerList);

      const response = await getDataFundtion(`/LoadForm/${loginVendor._id}`);
      let list = response.data || [];

      // Purane load forms par OrderBooker nahi hota; naam us load form ki invoice se aata hai.
      if (list.some((item) => !item.OrderBooker)) {
        try {
          const invoiceRes = await getDataFundtion(`/SalesInvoice/Distributer/${loginVendor._id}`);
          const bookerByForm = {};
          for (const invoice of invoiceRes.data || []) {
            const formNo = invoice.LoadFormNumber;
            const bookerId = idOf(invoice.OrderBooker);
            if (formNo && bookerId && !bookerByForm[formNo]) {
              bookerByForm[formNo] = bookerId;
            }
          }
          list = list.map((item) => ({
            ...item,
            OrderBooker: item.OrderBooker || bookerByForm[item.LoadFormNumber] || null,
          }));
        } catch (lookupErr) {
          console.log(lookupErr);
        }
      }

      const nameById = {};
      bookerList.forEach((ob) => {
        nameById[idOf(ob._id)] = ob.OrderBookerName || '';
      });

      const mapped = list.map((item) => {
        const bookerId = idOf(item.OrderBooker);
        return {
          ...item,
          OrderBookerId: bookerId,
          OrderBookerName: nameById[bookerId] || (bookerId ? bookerId : '-'),
        };
      });
      dispatch(fetchLoadForm(mapped));
      setAllRows(mapped);

      if (product.length == 0) {
        const productRes = await getDataFundtion("/product");
        dispatch(fetchproduct(productRes.data));
      }




    } catch (err) {
      console.log(err);
    }
    setLoading(false);

  };

  useEffect(() => {
    if (selectedOrderBooker === 'all') {
      setRows(allRows);
      return;
    }
    setRows(allRows.filter((row) => row.OrderBookerId === selectedOrderBooker));
  }, [allRows, selectedOrderBooker])

  

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
    const row = rows.find((item) => item._id == id);
    const isPosted = row && (row.PostStatus === true || String(row.Status).toLowerCase() === 'posted' || String(row.Status).toLowerCase() === 'closed');
    if (isPosted) {
      return toast.error('Cannot edit a posted/closed load form');
    }
    // No dedicated edit page yet for LoadForm
    toast.info('Edit for Load Forms is not available in this release. Use DSR to settle quantities.');
  };
  const handleViewClick = (id) => {
    navigate(`/LoadFormView/${id}`)
  }
  const handleDeleteClick = (id) => {
    const row = rows.find((item) => item._id == id);
    const isPosted = row && (row.PostStatus === true || String(row.Status).toLowerCase() === 'posted' || String(row.Status).toLowerCase() === 'closed');
    if (isPosted) {
      return toast.error('Cannot delete a posted/closed load form');
    }
    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    // LoadForm delete endpoint may differ; remove locally for now
    setAllRows((prev) => prev.filter((row) => row._id !== selectedId));
    toast.info('Removed from list (backend delete may require separate handling)');
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
      field: 'LoadFormDate',
      headerName: 'Load Form Date',
      width: 160,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'LoadFormNumber',
      headerName: 'Load Form #',
      width: 160,
      renderCell: (params) => params.row.LoadFormNumber || params.row.LoadForm || '-',
    },
    {
      field: 'OrderBookerName',
      headerName: 'Order Booker',
      width: 220,
    },
    {
      field: 'Total Products',
      headerName: 'Lines',
      width: 80,
      renderCell: (params) => (params?.row?.LoadFormData?.length || params?.row?.SalesData?.length || 0),
    },
    {
      field: 'Status',
      headerName: 'Status',
      width: 100,
      renderCell: (params) => {
        const s = params.row.Status || params.row.PostStatus;
        return s ? String(s) : '-';
      },
    },
    {
      field: 'TotalGross',
      headerName: 'Gross Total',
      width: 120,
      renderCell: (params) => {
        const data = params.row.LoadFormData || params.row.SalesData || [];
        const sum = data.reduce((acc, item) => acc + (parseFloat(item.GrossAmount) || 0), 0);
        return sum ? sum.toFixed(2) : '0.00';
      },
    },
    {
      field: 'TotalNet',
      headerName: 'Net Total',
      width: 120,
      renderCell: (params) => {
        const data = params.row.LoadFormData || params.row.SalesData || [];
        const sum = data.reduce((acc, item) => acc + (parseFloat(item.NetSale) || 0), 0);
        return sum ? sum.toFixed(2) : '0.00';
      },
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
      ],
    },
  ];
  const check = (num) => {
    console.log(num)
  }
  return (

    <div style={{ margin: 20, height: "70%", width: '80vw' }}>
      <ToastContainer />
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Order Booker</InputLabel>
          <Select
            value={selectedOrderBooker}
            label="Order Booker"
            onChange={(event) => setSelectedOrderBooker(event.target.value)}
          >
            <MenuItem value="all">All Order Bookers</MenuItem>
            {[...bookers]
              .sort((a, b) => (a.OrderBookerName || '').localeCompare(b.OrderBookerName || ''))
              .map((ob) => (
                <MenuItem key={ob._id} value={idOf(ob._id)}>
                  {ob.OrderBookerName}
                </MenuItem>
              ))}
          </Select>
        </FormControl>
      </Box>
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

export default LoadFormList