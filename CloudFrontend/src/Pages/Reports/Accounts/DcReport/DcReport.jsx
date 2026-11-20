import React, { useState, useEffect } from 'react';
import { getDataFundtion, updateDataFunction } from '../../../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';
import AppSelect from '../../../../Components/Global/AppSelect.jsx';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  Grid,
  IconButton,
  Button,
  Modal,
  TextField,
  CircularProgress,
  useTheme,
  useMediaQuery,
  Divider,
  Stack
} from '@mui/material';
import {
  DateRange as DateRangeIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  LocalShipping as ShippingIcon,
  FilterAlt as FilterIcon,
  CheckCircle as CheckCircleIcon,
  Autorenew as ProcessIcon,
  Groups as GroupsIcon,
  Download as DownloadIcon,
  Add as AddIcon,
  Save as SaveIcon
} from '@mui/icons-material';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatDate = (dateString) => {
  if (!dateString) return '';

  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateString;
  }
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const LoadingOverlay = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}
  >
    <Box sx={{ textAlign: 'center', color: 'white' }}>
      <CircularProgress sx={{ color: 'white', mb: 2 }} size={60} />
      <Typography variant="h6">Loading, please wait...</Typography>
    </Box>
  </Box>
);

const FilterModal = ({
  isOpen,
  onClose,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSubmit,
  isLoading,
  quickSelect,
  quickSelectOptions,
  years,
  selectedYear,
  selectedMonth,
  monthOptions,
  handleQuickSelect,
  handleYearChange,
  handleMonthChange
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="filter-modal-title"
    >
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90%', sm: 400 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography id="filter-modal-title" variant="h6" component="h2">
            Select Date Range
          </Typography>
          <IconButton onClick={onClose} disabled={isLoading} size="small">
            ✕
          </IconButton>
        </Box>

        <Stack spacing={3}>
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Quick Select
            </Typography>
            <AppSelect
              options={quickSelectOptions}
              value={quickSelectOptions.find(opt => opt.value === quickSelect)}
              onChange={(e) => handleQuickSelect(e.value)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select..."
            />
          </Box>
          {quickSelect === "YearToDate" && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Select Year
              </Typography>
              <AppSelect
                options={years}
                value={years.find(y => y.value === selectedYear)}
                onChange={(e) => handleYearChange(e)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Year..."
              />
            </Box>
          )}
          {quickSelect === "MonthToDate" && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Select Month
              </Typography>
              <AppSelect
                options={monthOptions}
                value={monthOptions.find(m => m.value === selectedMonth)}
                onChange={(e) => handleMonthChange(e)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Month..."
              />
            </Box>
          )}
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Date From
            </Typography>
            <TextField
              type="date"
              value={startDate}
              onChange={onStartDateChange}
              fullWidth
              size="small"
              disabled={isLoading || quickSelect !== "Custom"}
              InputLabelProps={{ shrink: true }}
              sx={quickSelect !== "Custom" ? { '& .MuiInputBase-input': { bgcolor: '#f5f5f5', cursor: 'not-allowed' } } : {}}
            />
          </Box>

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Date To
            </Typography>
            <TextField
              type="date"
              value={endDate}
              onChange={onEndDateChange}
              fullWidth
              size="small"
              disabled={isLoading || quickSelect !== "Custom"}
              InputLabelProps={{ shrink: true }}
              sx={quickSelect !== "Custom" ? { '& .MuiInputBase-input': { bgcolor: '#f5f5f5', cursor: 'not-allowed' } } : {}}
            />
          </Box>

          <Button
            onClick={onSubmit}
            disabled={isLoading || !startDate || !endDate}
            variant="contained"
            fullWidth
            size="large"
          >
            {isLoading ? 'Processing...' : 'Load Orders'}
          </Button>

          {(!startDate || !endDate) && (
            <Typography variant="body2" color="error" textAlign="center">
              Please select both dates
            </Typography>
          )}
        </Stack>
      </Box>
    </Modal>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const DcReport = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleExportExcel = async () => {
  const exportData =
    clearedOrders.length > 0 ? clearedOrders : orders;

  if (exportData.length === 0) {
    toast.error('No data to export');
    return;
  }

  const formattedData = exportData.map((row, i) => ({
    'Sr No': i + 1,
    'Order Code': row.OrderCode,
    'Distributor': getDistributorName(row.Client),
    'City': getDistributorCity(row.Client),
    'Product': getProductName(row.Product),
    'Order Box': row.OrderBox || 0,
    'Delivered Box': row.DeliveredBox || 0,
    'Cancel Box':
      row.CancelBox ??
      (row.OrderBox -
        ((row.DeliveredBox || 0) + (row.CanceledBox || 0))),
    'Remaining Box':
      (row.OrderBox || 0) -
      ((row.DeliveredBox || 0) + (row.CanceledBox || 0)),
    'Order Date': formatDate(row.DCDate),
    'Status': row.status
  }));

  try {
    await exportProfessionalExcel({
      title: 'DC Report',
      fileName: `DC_Report_${startDate}_to_${endDate}`,
      sheetName: 'DC Report',
      rows: formattedData,
      meta: [`Period: ${startDate || ''} to ${endDate || ''}`],
      excludeKeys: ['_id', 'id'],
    });
  } catch (error) {
    console.error('Excel export error:', error);
    toast.error('Failed to export Excel');
  }
};

  // ========== STATE ==========
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [quickSelect, setQuickSelect] = useState('Custom')
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
  const [orders, setOrders] = useState([]);
  const [clearedOrders, setClearedOrders] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [cities, setCities] = useState([]);
  const [products, setProducts] = useState([]);

  const quickSelectOptions = [
      { label: "Custom", value: "Custom" },
      { label: "Year to Date", value: "YearToDate" },
      { label: "Month to Date", value: "MonthToDate" }
  ];

    const currentYear = new Date().getFullYear();

    const monthOptions = [
        { label: "January", value: "01" },
        { label: "February", value: "02" },
        { label: "March", value: "03" },
        { label: "April", value: "04" },
        { label: "May", value: "05" },
        { label: "June", value: "06" },
        { label: "July", value: "07" },
        { label: "August", value: "08" },
        { label: "September", value: "09" },
        { label: "October", value: "10" },
        { label: "November", value: "11" },
        { label: "December", value: "12" }
    ];

  const handleQuickSelect = (value) => {
      setQuickSelect(value)
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]
      if (value === "MonthToDate") {
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(currentMonth);
            const firstDay = `${currentYear}-${currentMonth}-01`;
            setStartDate(firstDay);
            setEndDate(todayStr)
      } else if (value === "YearToDate") {
          const [start, end] = years.at(-1).label.split(" to ");
          setSelectedYear(years.at(-1).value)
          setStartDate(start)
          setEndDate(end)
      }
  }

  const handleYearChange = (year) => {
      setSelectedYear(year.value)
      const [start, end] = year.label.split(" to ");
      if (quickSelect === "YearToDate") {
          setStartDate(start)
          setEndDate(end)
      }
  }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
    }

  // ========== API CALLS ==========
  const fetchReportData = async () => {
    const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
    const yearList = yearRes.map((item) => ({
        label: `${item.DateStart} to ${item.DateEnd}`,
        value: item.DateStart.split('-')[0]
    }));
    setYears(yearList)

    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    setIsLoading(true);
    setClearedOrders([])
    setOrders([])
    try {
      // Fetch orders data
      const ordersData = await getDataFundtion(
        `/DcOrder/DcByDate?startDate=${startDate}&endDate=${endDate}`
      );

      // Fetch distributors for client names
      const distributorsData = await getDataFundtion(
        `/Distrbutor/DistrbutorNameId`
      );

      const citiesData = await getDataFundtion('/City');

      // Fetch products for product names
      const productsData = await getDataFundtion(
        `/Product/getProductNameId`
      );
      const filteredOrders = ordersData.filter(order => Number(order.OrderBox) !== ((order.DeliveredBox || 0) + Number(order.CanceledBox || 0)));

      // Update state
      setOrders(filteredOrders.sort((a, b) => {
        if (b.OrderCode !== a.OrderCode) {
          return b.OrderCode.localeCompare(a.OrderCode);
        }
        return new Date(b.DCDate) - new Date(a.DCDate);
      }));
      setDistributors(distributorsData);
      setCities(citiesData?.data || citiesData || []);
      setProducts(productsData.data || productsData);

      if (ordersData.length === 0) {
        toast.info('No orders found for the selected date range');
      } else {
        toast.success(`Loaded ${ordersData.length} orders`);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
      setIsModalOpen(false);
    }
  };

  // ========== EVENT HANDLERS ==========
  const handleStartDateChange = (e) => setStartDate(e.target.value);
  const handleEndDateChange = (e) => setEndDate(e.target.value);
  const handleFilterSubmit = () => fetchReportData();
  const handleOpenFilters = () => setIsModalOpen(true);

  // ========== UTILITY FUNCTIONS ==========
  const getDistributorName = (clientId) => {
    const distributor = distributors.find(d => d._id === clientId);
    return distributor?.DistrbutorName || clientId;
  };

  const getDistributorCity = (clientId) => {
    const distributor = distributors.find(d => d._id === clientId);
    if (!distributor?.City) return '';
    const city = cities.find(c => c._id == distributor.City);
    return city?.CityName || '';
  };

  const getProductName = (productId) => {
    const product = products.find(p => p._id === productId);
    return product?.ProductName || productId;
  };

const CancelOrder = async () => {
  try {
  const cancel = await updateDataFunction("/DistributorSaleOrder/CancelOrder", clearedOrders)
   const cleared =   setOrders(prev => prev.filter(order => !clearedOrders.some(cleared => cleared.OrderCode === order.OrderCode && cleared.Product === order.Product && cleared.row === order.row)));
     //console.log("Cleared Orders:", clearedOrders, "All Orders:", orders)
    toast.success('Order canceled successfully');
  } catch (error) {
    console.error('Error canceling order:', error);
    toast.error('Failed to cancel order');
  }
};

  const getStatusChip = (status) => {
    switch (status?.toLowerCase()) {
      case 'deliverd':
      case 'delivered':
        return (
          <Chip
            icon={<CheckCircleIcon />}
            label={status || 'Delivered'}
            color="success"
            size="small"
            variant="outlined"
          />
        );
      case 'process':
      case 'processing':
        return (
          <Chip
            icon={<ProcessIcon />}
            label={status || 'Processing'}
            color="info"
            size="small"
            variant="outlined"
          />
        );
      default:
        return (
          <Chip
            label={status || 'Pending'}
            color="default"
            size="small"
            variant="outlined"
          />
        );
    }
  };

  // ========== STATS CALCULATIONS ==========
  const totalClients = new Set(orders.map(o => o.Client)).size;
  const deliveredOrders = orders.filter(o =>
    o.status?.toLowerCase() === 'deliverd' ||
    o.status?.toLowerCase() === 'delivered'
  ).length;
  const processOrders = orders.filter(o =>
    o.status?.toLowerCase() === 'process' ||
    o.status?.toLowerCase() === 'processing'
  ).length;
  const totalBoxes = orders.reduce((sum, order) => sum + Number(order.OrderBox || 0), 0);
  const handleDeliveredBoxChange = (row, isChecked, index) => {
     //console.log(clearedOrders)
    setClearedOrders(prev => {
      const exists = prev.some(
        o =>
          o.OrderCode === row.OrderCode &&
          o.Product === row.Product &&
          o.row === row.row
      );

      if (isChecked) {
        if (exists) {
          //console.log(isChecked)
          // update existing product line
          return prev.map(item =>
            item.OrderCode === row.OrderCode &&
              item.Product === row.Product &&
              item.row === row.row
              ? {
                ...item,
                DeliveredBox: Number(row.OrderBox) || 0,
                CancelBox: 0
              }
              : item
          );

        }

        // add new product line
        return [
          ...prev,
          {
            OrderCode: row.OrderCode,
            Product: row.Product,
            OrderBox: Number(row.OrderBox) || 0,
            DeliveredBox: Number(row.DeliveredBox) || 0,
            CancelBox:
              Number(row.OrderBox) - Number(row.DeliveredBox || 0),
            row: row.row
          }
        ];
      }

      // ❌ unchecked → remove only that product line
      return prev.filter(
        item =>
          !(
            item.OrderCode === row.OrderCode &&
            item.Product === row.Product &&
            item.row === row.row
          )
      );
    });
  };




  // ========== RENDER ==========
  return (
    <ReportPageLayout title="Order Management">
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <ToastContainer />
      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay />}

      {/* Filter Modal */}
      <FilterModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={handleStartDateChange}
        onEndDateChange={handleEndDateChange}
        onSubmit={handleFilterSubmit}
        isLoading={isLoading}
        quickSelect={quickSelect}
        quickSelectOptions={quickSelectOptions}
        years={years}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        monthOptions={monthOptions}
        handleQuickSelect={handleQuickSelect}
        handleYearChange={handleYearChange}
        handleMonthChange={handleMonthChange}
      />

      {/* Header */}
      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Order Management
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          View and manage all customer orders in one place
        </Typography>

        {/* Header Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
          <Typography variant="h5" fontWeight="600">
            Orders List
          </Typography>
          <Button
            onClick={handleOpenFilters}
            variant="contained"
            startIcon={<FilterIcon />}
          >
            Change Date Range
          </Button>
        </Box>
      </Box>

      {/* Stats Summary */}
      {orders.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                    <GroupsIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Clients
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {totalClients}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'success.light', color: 'success.main' }}>
                    <CheckCircleIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Delivered Orders
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {deliveredOrders}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'info.light', color: 'info.main' }}>
                    <ProcessIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      In Process
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {processOrders}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'warning.light', color: 'warning.main' }}>
                    <InventoryIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Total Boxes
                    </Typography>
                    <Typography variant="h4" fontWeight="bold">
                      {Number(Number(totalBoxes || 0).toFixed(2))}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Main Content Card */}
      <Card elevation={3}>
        <CardHeader
          title={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" fontWeight="bold">
                Orders List
              </Typography>
              <Chip
                label={`${orders.length} Total Orders`}
                color="primary"
                variant="outlined"
              />
            </Box>
          }
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '& .MuiCardHeader-title': { color: 'white' }
          }}
        />

        {orders.length > 0 ? (
          <>
            {/* Desktop Table View */}
            {!isMobile ? (
              <TableContainer component={Paper} elevation={0}>
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Distributor</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>City</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Order Code</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Order Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Product</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Order Box</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Delivered Box</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Remaining Box</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Cancel</TableCell>

                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order, index) => (
                      <TableRow
                        key={index}
                        hover
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          '&:hover': { bgcolor: 'action.hover' }
                        }}
                      >
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                              {getDistributorName(order.Client).substring(0, 2).toUpperCase()}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {getDistributorName(order.Client)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Distributor
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {getDistributorCity(order.Client) || '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {getStatusChip(order.status)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 32, height: 32 }}>
                              <CalendarIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {order.OrderCode}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Order Code
                              </Typography>
                            </Box>

                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'info.light', color: 'info.main', width: 32, height: 32 }}>
                              <CalendarIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {order.DCDate ? formatDate(order.DCDate) : 'N/A'}
                              </Typography>
                              
                            </Box>


                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'success.light', color: 'success.main', width: 32, height: 32 }}>
                              <InventoryIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {getProductName(order.Product)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Product
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<ShippingIcon />}
                            label={order.OrderBox || 0}
                            color="warning"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </TableCell>
                        <TableCell>

                          <Chip
                            icon={<CheckCircleIcon />}
                            label={order.DeliveredBox || 0}
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />

                        </TableCell>
                        <TableCell>

                          <Chip

                            label={(order.OrderBox || 0) - ((order.DeliveredBox || 0) + Number(order.CanceledBox || 0))}
                            color="success"
                            variant="outlined"
                            sx={{ fontWeight: 'bold' }}
                          />

                        </TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            onChange={(e) => handleDeliveredBoxChange(order, e.target.checked, index)}
                            checked={clearedOrders.some(
                              o =>
                                o.OrderCode === order.OrderCode &&
                                o.productId === order.productId &&
                                o.row === order.row


                            )}
                          />

                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              /* Mobile Card View */
              <Box sx={{ p: 2 }}>
                {orders.map((order, index) => (
                  <Card key={index} sx={{ mb: 2, '&:hover': { boxShadow: 3 } }}>
                    <CardContent>
                      {/* Card Header */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'primary.light', color: 'primary.main' }}>
                            {getDistributorName(order.Client).substring(0, 2).toUpperCase()}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {getDistributorName(order.Client)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {getDistributorCity(order.Client) || 'Distributor'}
                            </Typography>
                          </Box>
                        </Box>
                        {getStatusChip(order.status)}
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      {/* Card Body */}
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              City
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getDistributorCity(order.Client) || '-'}
                          </Typography>
                        </Grid>

                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CalendarIcon fontSize="small" color="info" />
                            <Typography variant="caption" color="text.secondary">
                              Delivery Date
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {formatDate(order.DCDate)}
                          </Typography>
                        </Grid>

                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <InventoryIcon fontSize="small" color="success" />
                            <Typography variant="caption" color="text.secondary">
                              Product
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight="medium">
                            {getProductName(order.Product)}
                          </Typography>
                        </Grid>

                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <ShippingIcon fontSize="small" color="warning" />
                            <Typography variant="caption" color="text.secondary">
                              Order Box
                            </Typography>
                          </Box>
                          <Chip
                            label={order.OrderBox || 0}
                            color="warning"
                            variant="outlined"
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Grid>

                        <Grid item xs={6}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CheckCircleIcon fontSize="small" color="success" />
                            <Typography variant="caption" color="text.secondary">
                              Delivered Box
                            </Typography>
                          </Box>
                          {order.DeliveredBox ? (
                            <Chip
                              label={order.DeliveredBox}
                              color="success"
                              variant="outlined"
                              size="small"
                              sx={{ fontWeight: 'bold' }}
                            />
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontStyle="italic">
                              Not delivered
                            </Typography>
                          )}
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            )}

            {/* Footer */}
            <Box sx={{
              p: 2,
              bgcolor: 'grey.50',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                Showing <strong>{orders.length}</strong> orders
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Date Range: {formatDate(startDate)} - {formatDate(endDate)}
              </Typography>
            </Box>
          </>
        ) : (
          /* Empty State */
          <Box sx={{ p: 8, textAlign: 'center' }}>
            <InventoryIcon sx={{ fontSize: 60, color: 'grey.300', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Orders Found
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              {startDate && endDate
                ? 'No orders found for the selected date range.'
                : 'Select a date range to view orders.'}
            </Typography>
            <Button
              onClick={handleOpenFilters}
              variant="contained"
              startIcon={<FilterIcon />}
              sx={{ mt: 2 }}
            >
              Select Date Range
            </Button>
          </Box>
        )}
      </Card>

      {/* Action Buttons */}
      {orders.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
        <Button
  variant="outlined"
  startIcon={<DownloadIcon />}
  onClick={handleExportExcel}
>
  Export Excel
</Button>

          <Button
            variant="contained"
            startIcon={<SaveIcon />}
           onClick={()=> CancelOrder()}
          >
            
            Cancel Order
          </Button>
        </Box>
      )}
    </Container>
    </ReportPageLayout>
  );
};

export default DcReport;