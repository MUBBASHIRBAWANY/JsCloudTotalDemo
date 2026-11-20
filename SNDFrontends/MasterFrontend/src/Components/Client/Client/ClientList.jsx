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
import { fetchPricelistReducer } from '../../../Redux/Reducers/PricelistReducer';
import { filterByAssignedDistributors } from '../../Global/distributorAccess';

const ClientList = () => {
  const [rows, setRows] = useState();
  const [deleteR, setdeleteR] = useState(false)
  const dispatch = useDispatch()
  const [selectedId, setSelectedId] = useState(null);
  const [CsVendor, setCsVendor] = useState("")
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const CrRegion = useSelector((state) => state.Region.Region)
    const currentUser = useSelector((state) => state.LoginerReducer.userDetail);

  const navigate = useNavigate()
  const adminId = "68903ec2664155e11db10367"
  const [loading, setLoading] = useState(false);
  const [priceList, setPriceList] = useState([])
  const getData = async () => {
    setLoading(true)
    const data = await getDataFundtion(`/Customor`)
    const priceList = await getDataFundtion('/PriceList/')
    // const Vendor = await getDataFundtion('/Vendor')
    // const Region = await getDataFundtion('/Region')
    // const City = await getDataFundtion('/City')
    // const Zone = await getDataFundtion('/Zone')
    // const ChartofAccounts = await getDataFundtion("/ChartofAccounts")
    // const res = await getDataFundtion(`/Administrative/get/${adminId}`)
    console.log(priceList);
    setPriceList(priceList)
    dispatch(fetchPricelistReducer(priceList))
    console.log(data)
    const list = data.data
    const customerList = filterByAssignedDistributors(
      list,
      currentUser,
      (customer) => customer.Distributor || customer.Vendor || customer.Distrbutor
    )
    // setCsVendor(Vendor.data)
    const values = customerList.map((item, index) => ({
      id: item._id,
      mastercode: item.mastercode,
      code: item.code,
      CustomorName: item.CustomorName,
      Address: item.Address,
      NTN: item.NTN,
      STN: item.STN,
      mastercodeForCus: item.mastercodeForCus,
      AccountCode: item.AccountCode,
      Region: CrRegion.find((item1) => item1._id == item.Region)?.RegionName
    }))
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
  // const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  // const checkAcess = async () => {
  //   const allowAcess = await UserRihts.find((item) => item == DeleteRight)
  //   if (allowAcess) {
  //     setdeleteR(true)
  //   }
  //   const viweAcess = await UserRihts.find((item) => item == pageName)
  //   if (!viweAcess) {
  //     navigate("/")
  //   }


  // }
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
    { field: 'Region', headerName: 'Region', width: 200 },



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
      <DataGrid
        rows={rows}
        columns={columns}
        loading={loading}
        pageSize={5}
        getRowId={(row) => row.id}
        rowsPerPageOptions={[5]}
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

  );
}

export default ClientList