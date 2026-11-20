import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import axios, { all } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchVendor } from '../../../Redux/Reducers/VendorReducer';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';
import { fetchChannel } from '../../../Redux/Reducers/ChannelReducer';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';
import { fetchTerrotory } from '../../../Redux/Reducers/TerrotoryReducer';
import { fetchsubChannel } from '../../../Redux/Reducers/SubChannelReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import { set } from 'react-hook-form';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CurdFunctions';
import { fetchOrderBooker } from '../../../Redux/Reducers/OrderBookerReducer';
import * as XLSX from 'xlsx';

const applyGridFilters = (data, model) => {
  if (!data?.length || !model?.items?.length) return data || [];

  const activeFilters = model.items.filter(
    (item) => item.value != null && item.value !== ''
  );
  if (!activeFilters.length) return data;

  const isOr = model.logicOperator === 'or';

  return data.filter((row) => {
    const results = activeFilters.map((item) => {
      const cellValue = row[item.field];
      const filterValue = item.value;
      const cellStr = String(cellValue ?? '').toLowerCase();
      const filterStr = String(filterValue).toLowerCase();

      switch (item.operator) {
        case 'contains':
          return cellStr.includes(filterStr);
        case 'doesNotContain':
          return !cellStr.includes(filterStr);
        case 'equals':
          return cellStr === filterStr;
        case 'doesNotEqual':
          return cellStr !== filterStr;
        case 'startsWith':
          return cellStr.startsWith(filterStr);
        case 'endsWith':
          return cellStr.endsWith(filterStr);
        case 'isEmpty':
          return cellValue == null || cellValue === '';
        case 'isNotEmpty':
          return cellValue != null && cellValue !== '';
        case 'isAnyOf':
          return Array.isArray(filterValue) && filterValue.some((v) => String(cellValue) === String(v));
        default:
          return cellStr.includes(filterStr);
      }
    });

    return isOr ? results.some(Boolean) : results.every(Boolean);
  });
};

const ClientList = () => {
  const [rows, setRows] = useState();
  const [filterModel, setFilterModel] = useState({ items: [] });
  const [deleteR, setdeleteR] = useState(false)
  const dispatch = useDispatch()
  const [selectedId, setSelectedId] = useState(null);
  const [CsVendor, setCsVendor] = useState("")
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  
    const currentUser = useSelector((state) => state.LoginerReducer.userDetail);

  const navigate = useNavigate()
  const adminId = "68903ec2664155e11db10367"
  const [loading, setLoading] = useState(false);

  const getData = async () => {
    setLoading(true)
    const data = await getDataFundtion(`/Customor/AllCutomerByDis/${currentUser._id}`)
    const OderBooker = await getDataFundtion(`/orderbooker/OrderByvendor/${currentUser._id}`)
    console.log(data)
            dispatch(fetchOrderBooker(OderBooker.data))
    // const Vendor = await getDataFundtion('/Vendor')
    // const Region = await getDataFundtion('/Region')
    // const City = await getDataFundtion('/City')
    // const Zone = await getDataFundtion('/Zone')
    // const ChartofAccounts = await getDataFundtion("/ChartofAccounts")
    // const res = await getDataFundtion(`/Administrative/get/${adminId}`)

    console.log(data);

const list = data.data;
const OrderBookerName = OderBooker.data;

const values = list.map((item) => {
  const booker = OrderBookerName.find(
    (item1) => item1._id == item.OrderBooker
  );
console.log(booker)
  return {
    id: item._id,
    mastercode: item.mastercode,
    code: item.code,
    CustomorName: item.CustomorName,
    // Customer API data may use either casing for this field.
    Day: item.Day ?? item.Day ?? item['Day'] ?? item.Day,
    Address: item.Address,
    NTN: item.NTN,
    STN: item.STN,
    mastercodeForCus: item.mastercodeForCus,
    AccountCode: item.AccountCode,
    OrderBooker: booker.OrderBookerName
    
  };
});
console.log(values , "values")
    setRows(values)
    // dispatch(fetchChartofAccounts(ChartofAccounts.data))
    dispatch(fetchClient(list))
    // dispatch(fetchAdminReducer(res.data))
    // dispatch(fetchVendor(Vendor.data))
    // dispatch(fetchRegion(Region.data))
    // dispatch(fetchZone(Zone.data))
    // dispatch(fetchCity(City.data))

    setLoading(false)
  }

  const DeleteRight = "Delete Customer"
  const pageName = "List Customer"
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == DeleteRight)
    if (allowAcess) {
      setdeleteR(true)
    }
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (!viweAcess) {
      navigate("/")
    }


  }
  useEffect(() => {
//    checkAcess()
    getData()
  }, [])

  const handleEditClick = (id) => {
    console.log(id)
    navigate(`/ClientUpdate/${id}`)
  };

  const handleDeleteClick = (id) => {

    setSelectedId(id);
    setOpenDeleteDialog(true);
  };

  const exportToExcel = () => {
    const filteredRows = applyGridFilters(rows, filterModel);

    if (!filteredRows.length) {
      toast.error("No data available to download");
      return;
    }

    const excelData = filteredRows.map((row) => ({
      Code: row.code,
      'Customer Name': row.CustomorName,
      'Open Day': row.Day,
      Address: row.Address,
      NTN: row.NTN,
      STN: row.STN,
      OrderBooker: row.OrderBooker,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Customers');
    XLSX.writeFile(workbook, `Customer_List_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`);
  };

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false);
    if (deleteR) {
      try {
        const res = await deleteDataFunction(`Customor/deletCustomer/${selectedId}`)
        setRows(rows.filter((row) => row.id !== selectedId));
      }
      catch (err) {
        if (err.status == 400) {
          console.log(err)
          return toast.error(err.response.data)
        }
      }
    }
    else {
      toast.error("Access denied")
    }
  };

  const columns = [
    { field: 'code', headerName: 'Code' },
    { field: 'CustomorName', headerName: 'Customer Name', width: 250, },
    { field: 'Address', headerName: 'Address', width: 150, },
    { field: 'NTN', headerName: 'NTN', width: 150, },
    { field: 'STN', headerName: 'STN', width: 150, },
    { field: 'OrderBooker', headerName: 'OrderBooker', width: 200 },



    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 130,
      getActions: ({ id }) => [
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

  return (

    <div style={{ margin: "1vw", height: "70%", width: '80vw' }}>
      <ToastContainer />
      <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={exportToExcel}
          disabled={loading || !rows?.length}
          sx={{ backgroundColor: '#217346', '&:hover': { backgroundColor: '#1a5c38' } }}
        >
          Download to Excel
        </Button>
      </div>
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSize={5}
        getRowId={(row) => row.id}
        rowsPerPageOptions={[5]}
        experimentalFeatures={{ newEditingApi: true }}
        filterModel={filterModel}
        onFilterModelChange={setFilterModel}
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

  );
}

export default ClientList
