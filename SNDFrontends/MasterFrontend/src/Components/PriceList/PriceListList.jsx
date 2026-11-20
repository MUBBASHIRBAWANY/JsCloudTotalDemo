import { use, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { data, useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer.js';
import { getDataFundtion, deleteDataFunction } from '../../Api/CurdFunctions.jsx';
import { fetchPricelistReducer } from '../../Redux/Reducers/PricelistReducer.js';
import ExcelJS from 'exceljs';


const PriceListList = () => {

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
//   const Distributro = useSelector((state) => state.DistributroReducers.DistributroReducers)

  const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
  const pageName = "Sale Order"
  const DeleteRight = "Sale Order Delete"
  const Store = useSelector((state) => state.Store.Store)
  const Customer = useSelector((state) => state.Client.client)
  const Prod = useSelector((state) => state.Product.product);
  console.log(Store)
  const SaleOrder = useSelector((state) => state.DistributorOrder.DistributorOrder)
  const [rows, setRows] = useState(SaleOrder);

  const getData = async () => {
    setLoading(true)
    try {

      const data = await getDataFundtion("/PriceList")
      dispatch(fetchPricelistReducer(data))
      console.log(data)
      setRows(data)
      const product = await getDataFundtion("/Product/getProductNameId")
      dispatch(fetchproduct(product.data));



      setLoading(false)
    } catch (err) {
      console.log(err)
    }

  }

  useEffect(() => {
    setRows(SaleOrder)
  }, [SaleOrder])
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

  const handleEditClick = (id) => {
   
   
      navigate(`/PriceLIstEdit/${id}`)

   

  };
  const handleViewClick = (id) => {
    navigate(`/PriceListView/${id}`)
  }
  const handleDeleteClick = (id) => {
    const isPost = SaleOrder.find((item) => item._id == id).Status
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
    try {
      await deleteDataFunction(`SaleOrder/deleteSaleOrder/${selectedId}`)
      setRows(rows.filter((row) => row._id !== selectedId));
    } catch (err) {
      console.log(err.status)
      if (err.status == 400) {
        return toast.error(err.response.data)
      }
      console.log(err.response.data.message)
      toast.error("Some thing went wrong")
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
      field: 'PriceListNumber',
      headerName: 'PriceList Number',
      width: 200,
    },
    {
      field: 'PriceListDate',
      headerName: 'Price List Date',
      width: 200,
      renderCell: (params) => formatDate(params.value), // Use .value
    },
    {
      field: 'PriceListName',
      headerName: 'PriceList Name',
      width: 200,
    },
    {
      field: 'PriceListData',
      headerName: 'NoofProducts',
      renderCell: (params) => params.value?.length ?? 0,
      width: 200,


    },


    {
      field: 'PostStatus',
      headerName: 'PostStatus',
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
        
      ],
    },
  ];

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Price List');

    // Add header row
    sheet.addRow([
      'PriceList Number',
      'Price List Date',
      'PriceList Name',
      'No of Products',
      'Post Status'
    ]);

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF217346' }
    };
    headerRow.alignment = { horizontal: 'center' };

    // Add data rows
    rows.forEach(row => {
      sheet.addRow([
        row.PriceListNumber,
        formatDate(row.PriceListDate),
        row.PriceListName,
        row.PriceListData?.length ?? 0,
        row.PostStatus
      ]);
    });

    // Auto-fit columns
    sheet.columns.forEach(column => {
      column.width = 20;
    });

    // Generate and download file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PriceList_${new Date().toISOString().split('T')[0]}.xlsx`;
    link.click();
  };



  return (

    <div style={{ margin: `1vw`, height: "70%", width: '80vw' }}>
      <ToastContainer />
      <div style={{ marginBottom: '10px' }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<DownloadIcon />}
          onClick={exportToExcel}
          disabled={rows.length === 0}
        >
          Download Excel
        </Button>
      </div>
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
          <Button onClick={handleConfirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default PriceListList