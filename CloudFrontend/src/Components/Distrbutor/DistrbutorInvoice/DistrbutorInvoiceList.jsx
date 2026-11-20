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
import { getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import { fetchOrderDc } from '../../../Redux/Reducers/OrderDCReducer.js';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers.js';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer.js';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser.js';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer.js';
import { fetchTotalProducts } from '../../../Redux/Reducers/TotalProductsReducer.js';
import { fetchDistributorOrder } from '../../../Redux/Reducers/DistributorOrderReducer.js';
import { fetchDitributorInvoice } from '../../../Redux/Reducers/DistributorInvoiceReducer.js';
import { fetchChannelType } from '../../../Redux/Reducers/ChanneTypelReducer.js';
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer.js';
import { fetchCity } from '../../../Redux/Reducers/CityReducer.js';
import { fetchDistributorOrderBooker } from '../../../Redux/Reducers/DistributorOrderBookerReducer.js';


const DistrbutorInvoice = () => {
  const [rows, setRows] = useState();
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const DeleteRight = "Delete Sales"
  const EditRight = "Edit Sales"
  const DeleteSales = UserRihts.find((item) => item == DeleteRight)
  const EditSales = UserRihts.find((item) => item == EditRight)
    const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)

  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const Channel = useSelector((state) => state.Channel.Channel)
  const Store = useSelector((state) => state.Store.Store)
  const Prod = useSelector((state) => state.Product.product);
  const Location = useSelector((state) => state.Location.Location)
  const Distrbutor = useSelector((state) => state.DistributroReducers.DistributroReducers)

  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  const OrderDc = useSelector((state) => state.OrderDc.OrderDc)



  const getData = async () => {
    setLoading(true)
    try {
      const AdminiD = "687e14a624a274d5e844be49"
      const background = Promise.all([
        getDataFundtion("/PriceList"),
        getDataFundtion("/DcOrder/GetDcNotEqualFalse"),
        getDataFundtion(`/Administrative/get/${AdminiD}`),
        getDataFundtion("/ChartofAccounts"),
        getDataFundtion("/product"),
        getDataFundtion("/totalProduct"),
        getDataFundtion("/DitriButorOrderBooker"),
      ]).then(([PriceList, NotFalse, res, Accounts, product, total, OrderBooker]) => {
        dispatch(fetchPricelistReducer(PriceList))
        dispatch(fetchOrderDc(NotFalse))
        dispatch(fetchAdminReducer(res.data))
        dispatch(fetchChartofAccounts(Accounts.data))
        dispatch(fetchproduct(product.data))
        dispatch(fetchTotalProducts(total.data))
        dispatch(fetchDistributorOrderBooker(OrderBooker.data))
      }).catch((err) => console.log(err))

      const [data, City, allDistributr] = await Promise.all([
        getDataFundtion("/DistrbutorInvoice"),
        getDataFundtion("/City"),
        getDataFundtion("/Distrbutor"),
      ])

      dispatch(fetchDitributorInvoice(data))
      dispatch(fetchCity(City.data))

      const Distributr = LoginerVendor.City
        ? allDistributr.filter((item) => item.City == LoginerVendor.City)
        : allDistributr
      dispatch(fetchDistributroReducers(Distributr))

      const distById = new Map(Distributr.map((item) => [String(item._id), item]))
      const cityById = new Map((City.data || []).map((item) => [String(item._id), item.CityName]))
      const allData = data.map((item) => {
        const dis = distById.get(String(item.Distrbutor))
        return {
          ...item,
          Distrbutor: `${dis?.DistrbutorName || ""} ${dis?.OldCode || ""}`,
          City: cityById.get(String(dis?.City || "")) || "",
          citi1: dis?.City,
        }
      })
      setRows(LoginerVendor.City ? allData.filter((item) => item.citi1 == LoginerVendor.City) : allData)
      setLoading(false)
      await background
    } catch (err) {
      console.log(err)
      setLoading(false)
    }
  }


  useEffect(() => {
    setRows(OrderDc)
  }, [])

  const checkAcess = async () => {
    // Access check removed - using direct rights check
  }
  useEffect(() => {

    getData()
  }, [])

  const handleEditClick = (id) => {
    navigate(`/DistrbutorInvoiceEdit/${id}`)
  };
  const handleViewClick = (id) => {
    navigate(`/DistrbutorInvoiceView/${id}`)
  }
  const handleDeleteClick = (id) => {
    setSelectedId(id);
    setOpenDeleteDialog(true);

  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    try {
      // await deleteDataFunction(`DcOrder/deleteSaleOrder/${selectedId}`)
      // setRows(rows.filter((row) => row._id !== selectedId));
    } catch (err) {
      if (err.status == 400) {
        toast.error(err.response.data)
      }
      //console.log(err)
    }

  }
    ;
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(",", ""); // Removes the comma
  };
  const columns = [
    {
      field: 'InvoiceDate',
      headerName: 'InvoiceDate',
      width: 150,
      renderCell: (params) => formatDate(params.value), // Use .value
    },
    {
      field: 'DitributorInvoiceCode',
      headerName: 'Invoice Number',
      width: 150,

    },
    {
      field: 'DcNumber',
      headerName: 'DcNumber',
      width: 150,
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
      field: 'Distrbutor',
      headerName: 'Distrbutor',
      width: 200,
      
    },
    {
      field: 'City',
      headerName: 'City',
      width: 200,
      
    },
    {
      field: 'Total Products',
      headerName: 'Total Products',
      width: 250,
      renderCell: (params) => params?.row?.lineCount ?? params?.row?.InvoiceData?.length ?? 0,
    },

    {
      field: 'PostStatus',
      headerName: 'Status',
      width: 200,

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



  return (

    <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
      <ToastContainer />
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={5}
        getRowId={(row) => row._id}
        rowsPerPageOptions={[5]}
        loading={loading}
        experimentalFeatures={{ newEditingApi: true }}
      />

      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          {/* <Button onClick={handleConfirmDelete} color="error">Delete</Button> */}
        </DialogActions>
      </Dialog>
    </div></div>
  )
}

export default DistrbutorInvoice