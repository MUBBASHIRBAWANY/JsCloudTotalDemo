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
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';

import { fetchPurchaseOrder } from '../../Redux/Reducers/PurchaseOrderReducer';
import { fetchDistributroReducers } from '../../Redux/Reducers/DistributroReducers';
import { filterByAssignedDistributors } from '../Global/distributorAccess';

const PurchaseOrderList = () => {
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const Products = useSelector((state) => state.Product.product);
  const PurchaseOrder = useSelector((state) => state.PurchaseOrder.PurchaseOrder)
  const user = useSelector((state) => state.LoginerReducer.userDetail)

  const [rows, setRows] = useState(PurchaseOrder);


  const getData = async () => {
    setLoading(true)
    setRows(PurchaseOrder)
    try {
      if (Products.length < 1) {
        const product = await getDataFundtion("/product")
        dispatch(fetchproduct(product.data));
      }
      const Distributor = await getDataFundtion("/Distrbutor")
      dispatch(fetchDistributroReducers(Distributor))

      const data = await getDataFundtion(`/PurchaseOrder`)
      console.log(data)
      const list = filterByAssignedDistributors(data, user, (po) => po.Distrbutor)
      dispatch(fetchPurchaseOrder(list))
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

    getData()
  }, [])
  useEffect(() => {
    setRows(PurchaseOrder)
  }, [PurchaseOrder])

  const handleViewClick = (id) => {
    navigate(`/PurchaseOrderView/${id}`)
  }

 const handleEditClick = (id) => {
    const isPost = PurchaseOrder.find((item) => item._id == id).PostStatus
    if (isPost !== "Received") {
      return toast.error('access denied')
    }
    else {
      navigate(`/PurchaseOrderEdit/${id}`)

    }

  };



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
      field: 'OrderDate',
      headerName: 'Order Date',
      width: 200,
      renderCell: (params) => formatDate(params.value), // Use .value
    },
    {
      field: 'OrderCode',
      headerName: 'Invoice #',
      width: 200,
    },

    {
      field: 'Vendor',
      headerName: 'Vendor',
      width: 200,
      renderCell: (params) => params.value || "Pearl Daynamic",
    },
    {
      field: 'OrderData',
      headerName: 'Total Products',
      width: 250,
      renderCell: (params) => params?.row?.OrderData?.length || 0,
    },
    {
      field: 'TotalAmount',
      headerName: 'Net Amount',
      width: 250,
    },
    {
      field: 'PostStatus',
      headerName: 'Status',
      width: 250,
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

      ],
    },
  ];



  return (

    <div style={{ margin: `1vw`, height: "70%", width: '80vw' }}>
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


    </div>
  )
}

export default PurchaseOrderList