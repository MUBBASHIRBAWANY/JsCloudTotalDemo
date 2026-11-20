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

import { fetchDistributorOrder } from '../../../Redux/Reducers/DistributorOrderReducer.js';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer.js';
import { getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers.js';
import { fetchCity } from '../../../Redux/Reducers/CityReducer.js';
import { buildSaleOrderRows, canEditSaleOrder } from './saleOrderList.js';

const DistributorSaleOrderList = () => {

    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const EditRight = "Edit SaleOrder"
    const EditSaleOrder = UserRihts.find((item) => item == EditRight)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const Distributro = useSelector((state) => state.DistributroReducers.DistributroReducers)
    //console.log(Distributro)
    const OrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
    const pageName = "Sale Order"
    const DeleteRight = "Sale Order Delete"
    const Store = useSelector((state) => state.Store.Store)
    const Customer = useSelector((state) => state.Client.client)
    const City = useSelector((state) => state.City.City)
    const Prod = useSelector((state) => state.Product.product);
    //console.log(Store)
    const SaleOrder = useSelector((state) => state.DistributorOrder.DistributorOrder)
    const [rows, setRows] = useState([]);
    const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)   

    const getData = async () => {
        setLoading(true)
        try {
            const productPromise = getDataFundtion("/product/getProductNameId")
                .then((product) => {
                    const SndProducts = (product.data || []).filter((item) => item.isForSND == "true")
                    dispatch(fetchproduct(SndProducts));
                })
                .catch((err) => console.log(err))

            const [data, Distributr, CityRes] = await Promise.all([
                getDataFundtion("/DistributorSaleOrder/list"),
                getDataFundtion("/Distrbutor/DistrbutorNameId"),
                getDataFundtion("/City"),
            ])
            dispatch(fetchDistributorOrder(data))
            dispatch(fetchDistributroReducers(Distributr))
            dispatch(fetchCity(CityRes.data))
            setRows(buildSaleOrderRows(data, Distributr, CityRes.data, LoginerVendor.City))
            setLoading(false)
            await productPromise
        } catch (err) {
            console.log(err)
            setLoading(false)
        }

    }

    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == DeleteRight)
        //console.log(allowAcess)
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

        const order = SaleOrder.find((item) => item._id == id)
        if (!canEditSaleOrder(order)) {
            toast.error(`This Order is ${order?.PostStatus || "Deliverd"}`)
        }
        else {
            navigate(`/SaleOrderEdit/${id}`)

        }

    };
    const handleViewClick = (id) => {
        navigate(`/DistributorSaleOrderView/${id}`)
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
            //console.log(err.status)
            if (err.status == 400) {
                return toast.error(err.response.data)
            }
            //console.log(err.response.data.message)
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
            field: 'OrderDate',
            headerName: 'Order Date',
            width: 200,
            renderCell: (params) => formatDate(params.value), // Use .value
        },
        {
            field: 'OrderCode',
            headerName: 'Order #',
            width: 200,
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
            field: 'Store',
            headerName: 'Store',
            width: 100,
            renderCell: (params) => {
                const Store1 = Store.find(Store => Store._id === params.value);
                return Store1 ? `${Store1.StoreName} (${Store1.code})` : 'PCL';
            },

        },

        {
            field: 'PostStatus',
            headerName: 'PostStatus',
            width: 250,

        },
        
        {
            field: 'Remarks',
            headerName: 'Remarks',
            width: 250,

        },
        {
            field: 'TotalAmount',
            headerName: 'TotalAmount',
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
                ...(EditSaleOrder ? [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleEditClick(id)}
                        color="edit"
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
                    <Button onClick={handleConfirmDelete} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </div></div>
    )
}

export default DistributorSaleOrderList