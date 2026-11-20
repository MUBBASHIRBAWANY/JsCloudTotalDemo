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
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchSalesInvoiceReturn } from '../../Redux/Reducers/SalesInvoiceReturnReducer';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import { useLoader } from '../../hooks/useLoader';
import { fetchDistributroReducers } from '../../Redux/Reducers/DistributroReducers';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import { fetchVendor } from '../../Redux/Reducers/VendorReducer';

const SalesInvoiceReturnList = () => {
  const { loading, showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [pageSize, setPageSize] = useState(100);
  const [rows, setRows] = useState([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const DeleteRight = "Delete SalesReturn"
  const EditRight = "Edit SalesReturn"
  const DeleteSalesReturn = UserRihts.find((item) => item == DeleteRight)
  const EditSalesReturn = UserRihts.find((item) => item == EditRight)
  const category = useSelector((state) => state.Category.category)
  const Client = useSelector((state) => state.Client.client)
console.log(Client , "Client")
  const getData = async () => {
    //console.log("first");
    showLoader("Loading Sales Invoice Return...");
    const id = "687e14a624a274d5e844be49"
    try {
      updateProgress(25);
      const response = await getDataFundtion(`/SalesInvoiceReturn?page=${page + 1}&limit=${pageSize}`);
      //console.log(`/SaleInvoice?page=${page + 1}&limit=${pageSize}`);
      const customer = await getDataFundtion("/customer");
      const Distributor = await getDataFundtion("/Distrbutor/DistrbutorNameId")
      dispatch(fetchDistributroReducers(Distributor))
      updateProgress(50);
      const product = await getDataFundtion("/product");
      const orderBooker = await getDataFundtion("/OrderBooker");
      const AllProducts = await getDataFundtion("/TotalProduct")
      const res = await getDataFundtion(`/Administrative/get/${id}`)
      const vendor = await getDataFundtion("/vendor")
      dispatch(fetchVendor(vendor.data))

      const adminData = res.data
      dispatch(fetchAdminReducer(adminData))
      updateProgress(75);
      const list = response.data;
      const sortedInvoice = [...list].sort((a, b) => a.SalesInvoice - b.SalesInvoice)

      dispatch(fetchSalesInvoiceReturn(sortedInvoice));
      dispatch(fetchproduct(product.data));
      dispatch(fetchClient(customer.data.concat(Distributor)));
      dispatch(fetchOrderBooker(orderBooker.data));
      dispatch(fetchTotalProducts(AllProducts.data))
      updateProgress(100);
      setRows(list);
      setTimeout(hideLoader, 500)

    } catch (err) {
      //console.log(err);
    } finally {
      hideLoader();
    }

  };



  const checkAcess = async () => {
    // Access check removed - using direct rights check
  }
  useEffect(() => {
    //console.log("useEffect triggered", page, pageSize);
    getData();
  }, [page, pageSize]);
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
      field: 'SalesFlowRef',
      headerName: 'Sales Flow Ref',
      width: 200,
    },
    {
      field: 'Client',
      headerName: 'Client',
      width: 200,
      renderCell: (params) => {
        const vendor1 = Client.find(vendor => vendor._id === params.value);
        return vendor1 ? `${vendor1.CutomerName || vendor1.DistrbutorName}` : 'Vendor Not Found';
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
        params.row.SalesReturnData?.reduce((sum, item) => sum + Number(item.Gst), 0).toFixed(2)
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
    },
    {
      field: 'PostStatus',
      headerName: 'status',
      width: 100,
    },
    {
      field: 'Damage',
      headerName: 'Type',
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
        ...(EditSalesReturn ? [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="Edit"
            onClick={() => handleEditClick(id)}
          />,
        ] : []),
        ...(DeleteSalesReturn ? [
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
    </div></div>
  )
}

export default SalesInvoiceReturnList