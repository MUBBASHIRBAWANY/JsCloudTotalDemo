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
import { deleteDataFunction, getDataFundtion } from '../../Api/CurdFunctions.jsx';
import { fetchVendor } from "../../Redux/Reducers/VendorReducer"
import { fetchSaleOrder } from '../../Redux/Reducers/SaleOrderReducer.js';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchLocation } from '../../Redux/Reducers/LocationReducer';
import { fetchStore } from '../../Redux/Reducers/StoreReducer';
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer.js';
import { fetchOrderDc } from '../../Redux/Reducers/OrderDCReducer.js';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer.js';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer.js';
import { filterByAssignedDistributors } from '../Global/distributorAccess';


const OrderDCList = () => {
    const [rows, setRows] = useState();
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)

    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const Customer = useSelector((state) => state.Client.client)
    const Store = useSelector((state) => state.Store.Store)
    const Prod = useSelector((state) => state.Product.product);
    const Location = useSelector((state) => state.Location.Location)
    const TotalProduct = useSelector((state) => state.TotalProducts.TotalProducts)
    const SaleOrder = useSelector((state) => state.SaleOrder.SaleOrder)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const OrderDc = useSelector((state) => state.OrderDc.OrderDc)
    const loginuser = useSelector((state) => state.LoginerReducer.userDetail)


    const getData = async () => {
        setLoading(true)
        try {
            if (OrderDc.length < 1) {
                const data = await getDataFundtion("/DcOrder")

                dispatch(fetchOrderDc(data.data))


            }
            if (SaleOrder.length < 1) {
                const Order = await getDataFundtion("/SaleOrder")
                dispatch(fetchSaleOrder(Order.data))
            }
            if (Admin.length < 1) {
                const AdminiD = "68903ec2664155e11db10367"
                const res = await getDataFundtion(`/Administrative/get/${AdminiD}`)
                dispatch(fetchAdminReducer(res.data))
            }
            if (Accounts.length < 1) {
                const Accounts = await getDataFundtion('/ChartofAccounts')
                dispatch(fetchChartofAccounts(Accounts.data))
            }
            if (Prod.length < 1) {
                const product = await getDataFundtion("/product")
                dispatch(fetchproduct(product.data));
            }
            if (Location.length < 1) {
                const loction = await getDataFundtion('/Location')
                dispatch(fetchLocation(loction.data))
            }
            if (Store.length < 1) {
                const Store = await getDataFundtion("/store")
                dispatch(fetchStore(Store.data))
            }
            if (Customer.length < 1) {
                const Client = await getDataFundtion("/Customor")
                dispatch(fetchClient(Client.data))
            }
            if (OrderBooker.length < 1) {
                const OderBooker = await getDataFundtion('/orderbooker')
                dispatch(fetchOrderBooker(OderBooker.data))
            }

            if (TotalProduct.length < 1) {
                const total = await getDataFundtion('/totalProduct')
                dispatch(fetchTotalProducts(total.data))
            }
            console.log(OrderDc)
            setLoading(false)


        } catch (err) {
            console.log(err)
        }

    }


    useEffect(() => {
        setRows(filterByAssignedDistributors(OrderDc, loginuser, (item) => item.Distrbutor))
    }, [OrderDc, loginuser])

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
        navigate(`/OrderDCEdit/${id}`)
    };
    const handleViewClick = (id) => {
        navigate(`/OrderDCView/${id}`)
    }
    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);

    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);
        try {
           await deleteDataFunction(`DcOrder/deleteSaleOrder/${selectedId}`)
            setRows(rows.filter((row) => row._id !== selectedId));
        } catch (err) {
            if(err.status == 400){
                toast.error(err.response.data)
            }
            console.log(err)
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
            field: 'DcDate',
            headerName: 'DcDate',
            width: 150,
            renderCell: (params) => formatDate(params.value), // Use .value
        },
        {
            field: 'DcNumber',
            headerName: 'Order #',
            width: 150,
        },
        {
            field: 'OrderBooker',
            headerName: 'Order Booker',
            width: 200,
            renderCell: (params) => {
                const OrderBookerId1 = OrderBooker.find(Store => Store._id === params.row?.DcData[0]?.OrderBooker);
                return OrderBookerId1 ? `${OrderBookerId1.OrderBookerName} (${OrderBookerId1.code})` : 'OrderBooker Not Found';
            },

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
            field: 'Customer',
            headerName: 'Customer',
            width: 200,
            renderCell: (params) => {
                const Customer1 = Customer.find(Customer => Customer._id === params.value);
                return Customer1 ? `${Customer1.CutomerName} (${Customer1.code})` : 'Vendor Not Found';
            },
        },
        {
            field: 'Total Products',
            headerName: 'Total Products',
            width: 250,
            renderCell: (params) => params?.row?.DcData?.length || 0,
        },

        {
            field: 'Status',
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

export default OrderDCList