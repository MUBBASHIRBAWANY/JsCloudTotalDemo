import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions';
import { fetchSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchDistributroReducers } from '../../Redux/Reducers/DistributroReducers';

const getInvoiceGross = (row) =>
  row?.SalesData?.reduce(
    (sum, item) => sum + Number(item?.GrossAmount ?? item?.Amount ?? 0),
    0
  ) || 0;

const getInvoiceNet = (row) =>
  row?.SalesData?.reduce(
    (sum, item) => sum + Number(item?.NetAmount ?? item?.NetSale ?? item?.netAmunt ?? 0),
    0
  ) || 0;

const getInvoiceTradeOffer = (row) =>
  row?.SalesData?.reduce(
    (sum, item) => sum + Number(item?.TO ?? item?.To ?? item?.Discount ?? 0),
    0
  ) || 0;

const SalesInvoiceList = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const UserRihts = useSelector((state) => state.UsersRights.UserRights);
  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker);
  const SalesInvoice = useSelector((state) => state.SalesInvoice.DisSalesInvoice);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const currentUser = useSelector((state) => state.LoginerReducer.userDetail);
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers);
  
  const [selectedDistributor, setSelectedDistributor] = useState('all');
  const [summaryData, setSummaryData] = useState({
    totalInvoices: 0,
    totalProducts: 0,
    totalGst: 0,
    totalGrossAmount: 0,
    totalNetAmount: 0,
    totalTradeOffer: 0,
    totalPending: 0
  });

  // Fetch all distributors for filter dropdown
  const fetchAllDistributors = async () => {
    try {
      const res = await getDataFundtion('/DistributroReducers');
      dispatch(fetchDistributroReducers(res.data));
    } catch (err) {
      console.log(err);
    }
  };

  const getData = async () => {
    setLoading(true);
    try {
      const Client = await getDataFundtion(`/Customor/AllCutomerByDis/${currentUser._id}`);
      dispatch(fetchClient(Client.data));

      const orderBooker = await getDataFundtion("/OrderBooker");
      dispatch(fetchOrderBooker(orderBooker.data));

      let response;
      // If 'all' selected, get all invoices from all distributors
      if (selectedDistributor === 'all') {
        response = await getDataFundtion(`/SalesInvoice/AllInvoices`);
      } else {
        // Get invoices for specific distributor
        response = await getDataFundtion(`/SalesInvoice/Distributer/${selectedDistributor}`);
      }
      
      const list = (response.data || []).filter((item) => item.PostStatus !== "Cancel");
      const allData = list.map((item) => {
        const orderBookerData = orderBooker.data.find(ob => ob._id === item.OrderBooker);
        const clientData = Client.data.find(client => client._id === item.Client);
        return {
          ...item,
          OrderBooker: orderBookerData ? `${orderBookerData.OrderBookerName} (${orderBookerData.code})` : 'Order Booker Not Found',
          Client: clientData ? `${clientData.CustomorName} (${clientData.code})` : 'Client Not Found',
        };
      });
      dispatch(fetchSalesInvoice(allData));

      // Calculate summary data
      calculateSummary(allData);

    } catch (err) {
      console.log(err);
    }
    setLoading(false);
  };

  // Calculate sales invoice summary
  const calculateSummary = (data) => {
    const totalInvoices = data.length;
    const totalProducts = data.reduce((sum, item) => sum + (item.SalesData?.length || 0), 0);
    const totalGst = data.reduce((sum, item) => 
      sum + (item.SalesData?.reduce((s, i) => s + Number(i.Gst || 0), 0) || 0), 0);
    const totalGrossAmount = data.reduce((sum, item) =>
      sum + getInvoiceGross(item), 0);
    const totalNetAmount = data.reduce((sum, item) =>
      sum + getInvoiceNet(item), 0);
    const totalTradeOffer = data.reduce((sum, item) =>
      sum + getInvoiceTradeOffer(item), 0);
    const totalPending = data.reduce((sum, item) => sum + (Number(item.Remaining) || 0), 0);

    setSummaryData({
      totalInvoices: totalInvoices || 0,
      totalProducts: totalProducts || 0,
      totalGst: parseFloat(totalGst.toFixed(2)),
      totalGrossAmount: parseFloat(totalGrossAmount.toFixed(2)),
      totalNetAmount: parseFloat(totalNetAmount.toFixed(2)),
      totalTradeOffer: parseFloat(totalTradeOffer.toFixed(2)),
      totalPending: parseFloat(totalPending.toFixed(2))
    });
  };

  useEffect(() => {
    setRows((SalesInvoice || []).filter((item) => item.PostStatus !== "Cancel"));
  }, [SalesInvoice]);

  useEffect(() => {
    fetchAllDistributors();
    getData();
  }, [selectedDistributor]);

  const handleDistributorChange = (event) => {
    setSelectedDistributor(event.target.value);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", "");
  };

  const handleViewClick = (id) => {
    navigate(`/SalesInvoiceView/${id}`);
  };

  const handleDeleteClick = (id) => {
    const isPost = rows.find((item) => item._id == id).PostStatus;
    if (isPost == true) {
      return toast.error('first unpost for delete');
    } else {
      setSelectedId(id);
      setOpenDeleteDialog(true);
    }
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    await deleteDataFunction(`/SaleInvoice/SaleInvoiceDelete/${selectedId}`);
    setRows(rows.filter((row) => row._id !== selectedId));
  };

  const columns = [
    {
      field: 'SalesInvoiceDate',
      headerName: 'Invoice Date',
      width: 200,
      renderCell: (params) => formatDate(params.value),
    },
    {
      field: 'DisSalesInvoice',
      headerName: 'Invoice #',
      width: 200,
    },
    {
      field: 'OrderBooker',
      headerName: 'OrderBooker',
      width: 150,
    },
    {
      field: 'Client',
      headerName: 'Client',
      width: 300,
    },
    {
      field: 'SalesData',
      headerName: 'Total Products',
      width: 80,
      renderCell: (params) => params?.row?.SalesData?.length || 0,
    },
    
    {
      field: 'TotalGross',
      headerName: 'Gross Amount',
      width: 120,
      valueGetter: (value, row) => getInvoiceGross(row),
      renderCell: (params) => Number(params.value || 0).toFixed(2),
    },
    {
      field: 'TotalNet',
      headerName: 'Net Amount',
      width: 120,
      valueGetter: (value, row) => getInvoiceNet(row),
      renderCell: (params) => Number(params.value || 0).toFixed(2),
    },
    {
      field: 'TotalTO',
      headerName: 'Trade Offer',
      width: 120,
      valueGetter: (value, row) => getInvoiceTradeOffer(row),
      renderCell: (params) => Number(params.value || 0).toFixed(2),
    },
    {
      field: 'PostStatus',
      headerName: 'Status',
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
      ],
    },
  ];

  // Get distributor name for display
  const getDistributorName = (distId) => {
    if (distId === 'all') return 'All Distributors';
    const dist = Distributors.find(d => d._id === distId);
    return dist ? dist.DistrbutorName : 'Unknown';
  };

  return (
    <div style={{ margin: 20, padding: 20 }}>
      <ToastContainer />
      
      {/* Header with Distributor Filter */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Sales Invoice List
        </Typography>
        <FormControl variant="outlined" sx={{ minWidth: 250 }}>
          <InputLabel>Distributor</InputLabel>
          <Select
            value={selectedDistributor}
            label="Distributor"
            onChange={handleDistributorChange}
          >
            <MenuItem value="all">All Distributors</MenuItem>
            {Distributors?.map((dist) => (
              <MenuItem key={dist._id} value={dist._id}>
                {dist.DistrbutorName} ({dist.ShortCode})
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Sales Invoice Summary Cards */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Sales Invoice Summary - {getDistributorName(selectedDistributor)}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Invoices</Typography>
                <Typography variant="h4">{summaryData.totalInvoices}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'secondary.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Products</Typography>
                <Typography variant="h4">{summaryData.totalProducts}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'success.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Net Amount</Typography>
                <Typography variant="h4"> {summaryData.totalNetAmount.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Gross Amount</Typography>
                <Typography variant="h4"> {summaryData.totalGrossAmount.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'info.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total GST</Typography>
                <Typography variant="h4"> {summaryData.totalGst.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: 'error.main', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Trade Offer</Typography>
                <Typography variant="h4"> {summaryData.totalTradeOffer.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card sx={{ bgcolor: '#607D8B', color: 'white' }}>
              <CardContent>
                <Typography variant="caption">Total Pending</Typography>
                <Typography variant="h4"> {summaryData.totalPending.toLocaleString()}</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>

      {/* Data Grid */}
      <Box sx={{ height: 500, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 25]}
          loading={loading}
          getRowId={(row) => row._id}
          disableSelectionOnClick
        />
      </Box>

      {/* Delete Confirmation Dialog */}
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
  );
};

export default SalesInvoiceList;
