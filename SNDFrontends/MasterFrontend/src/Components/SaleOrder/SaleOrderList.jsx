import axios from 'axios';
import { use, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { data, useNavigate } from 'react-router-dom';
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
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer.js';
import { set } from 'react-hook-form';
import { filterByAssignedDistributors } from '../Global/distributorAccess';

const SaleOrderList = () => {

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const category = useSelector((state) => state.Category.category)
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const pageName = "Sale Order"
    const DeleteRight = "Sale Order Delete"
    const Customer = useSelector((state) => state.Client.client)
    const Prod = useSelector((state) => state.Product.product);
    const SaleOrder = useSelector((state) => state.SaleOrder.SaleOrder)
    const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
    const [rows, setRows] = useState(SaleOrder);

    const getData = async () => {
        setLoading(true)
        try {
            if (SaleOrder.length < 1) {
                const data = await getDataFundtion("/saleOrder")
                dispatch(fetchSaleOrder(data.data))
                console.log(data)
                setRows(filterByAssignedDistributors(data.data, loginuser, (item) => item.Distrbutor))
            }
          
            if (Customer.length < 1) {
                const Client = await getDataFundtion("/Customor")
                dispatch(fetchClient(Client.data))
            }
            if (Prod.length < 1) {
                const product = await getDataFundtion("/product")
                dispatch(fetchproduct(product.data));
            }
            if (location.length < 1) {
                const loction = await getDataFundtion('/Location')
                dispatch(fetchLocation(loction.data))
            }
            if (Accounts.length < 1) {
                const Accounts = await getDataFundtion('/ChartofAccounts')
                dispatch(fetchChartofAccounts(Accounts.data))
            }
            if (OrderBooker.length < 1) {
                const OderBooker = await getDataFundtion('/orderbooker')
                dispatch(fetchOrderBooker(OderBooker.data))
            }
            setLoading(false)
        } catch (err) {
            console.log(err)
        }

    }

    useEffect(() => {
        setRows(filterByAssignedDistributors(SaleOrder, loginuser, (item) => item.Distrbutor))
    }, [SaleOrder, loginuser])
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
        const isPost = SaleOrder.find((item) => item._id == id).Status
        console.log(isPost)
        if (isPost !== "true") {
            return toast.error(`This Order ${isPost}`)
        }
        else {
            navigate(`/SaleOrderEdit/${id}`)

        }

    };
    const handleViewClick = (id) => {
        navigate(`/SaleOrderView/${id}`)
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
            if(err.status == 400){
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
            field: 'SaleOrderDate',
            headerName: 'Invoice Date',
            width: 200,
            renderCell: (params) => formatDate(params.value), // Use .value
        },
        {
            field: 'SaleOrderNumber',
            headerName: 'Order #',
            width: 200,
        },
        {
            field: 'OrderBookerId',
            headerName: 'Order Booker',
            width: 200,
            renderCell: (params) => {
                const OrderBookerId1 = OrderBooker.find(Store => Store._id === params.value);
                return OrderBookerId1 ? `${OrderBookerId1.OrderBookerName} (${OrderBookerId1.code})` : 'Store Not Found';
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
            renderCell: (params) => params?.row?.SaleOrderData?.length || 0,
        },
        {
            field: 'Amount',
            headerName: 'Amount',
            width: 250,
            renderCell: (params) =>
                params.row.SaleOrderData?.reduce((sum, item) => sum + Number(item.Amount), 0).toFixed(2) || 0
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

export default SaleOrderList