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
import { fetchVendor } from "../../Redux/Reducers/VendorReducer"
import { fetchPurchaseReturn } from '../../Redux/Reducers/PurchaseReturnReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchLocation } from '../../Redux/Reducers/LocationReducer';
import { fetchStore } from '../../Redux/Reducers/StoreReducer';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';

const PurchaseReturnList = () => {
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const category = useSelector((state) => state.Category.category)
    const Vendor = useSelector((state) => state.Vendor.state)
    const PurchaseReturn = useSelector((state) => state.PurchaseReturn.PurchaseReturn)
    const Products = useSelector((state) => state.Product.product);
    const Store = useSelector((state) => state.Store.Store)
    const location = useSelector((state) => state.Location.Location)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const TotalProducts = useSelector((state) => state.TotalProducts.TotalProducts)
    const [rows, setRows] = useState(PurchaseReturn);

    const getData = async () => {
        setLoading(true)
        try {
            if (Admin.length < 1) {
                const AdminId = "68903ec2664155e11db10367"
                const res = await getDataFundtion(`/Administrative/get/${AdminId}`)
                dispatch(fetchAdminReducer(res.data))
                console.log(Admin)
            }
            if (Vendor.length < 1) {
                const vendor = await getDataFundtion("/vendor")
                dispatch(fetchVendor(vendor.data))
            }
            if (Products.length < 1) {
                const product = await getDataFundtion("/product")
                dispatch(fetchproduct(product.data));
            }
            if (location.length < 1) {
                const loction = await getDataFundtion('/Location')
                dispatch(fetchLocation(loction.data))
            }
            if (Store.length < 1) {
                const Store = await getDataFundtion("/store")
                dispatch(fetchStore(Store.data))
            }
            if (Accounts.length < 1) {
                const Accounts = await getDataFundtion('/ChartofAccounts')
                dispatch(fetchChartofAccounts(Accounts.data))
            }
            if (PurchaseReturn.length < 1) {
                const data = await getDataFundtion("/PurchaseReturn")
                console.log(data)
                const list = data.data
                dispatch(fetchPurchaseReturn(list))
                setRows(list)
            }
            if (TotalProducts.length < 1) {
                const TotalProduct = await getDataFundtion('/TotalProduct')
                dispatch(fetchTotalProducts(TotalProduct.data))
            }
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
        setRows(PurchaseReturn)
    }, [PurchaseReturn])

    const handleEditClick = (id) => {
        const isPost = PurchaseReturn.find((item) => item._id == id).PostStatus
        if (isPost == true) {
            return toast.error('first unpost for edit')
        }
        else {
            navigate(`/PurchaseReturnEdit/${id}`)

        }

    };
    const handleViewClick = (id) => {
        navigate(`/PurchaseReturnView/${id}`)
    }
    const handleDeleteClick = (id) => {
        const isPost = PurchaseReturn.find((item) => item._id == id).PostStatus
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
        deleteDataFunction(`PurchaseReturn/PurchaseReturnDelete/${selectedId}`)

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
            field: 'PurchaseReturnDate',
            headerName: 'Invoice Date',
            width: 200,
            renderCell: (params) => formatDate(params.value), // Use .value
        },
        {
            field: 'PurchaseReturn',
            headerName: 'Purchase #',
            width: 200,
        },
       
        {
            field: 'Vendor',
            headerName: 'Vendor',
            width: 200,
            renderCell: (params) => {
                const vendor1 = Vendor.find(vendor => vendor._id === params.value);
                return vendor1 ? `${vendor1.VendorName} (${vendor1.code})` : 'Vendor Not Found';
            },
        },
        {
            field: 'Total Products',
            headerName: 'Total Products',
            width: 250,
            renderCell: (params) => params?.row?.PurchaseReturnData?.length || 0,
        },
        {
            field: 'Total Gst',
            headerName: 'Total GST',
            width: 250,
            renderCell: (params) =>
                params.row.PurchaseReturnData?.reduce((sum, item) => sum + Number(item.Gst), 0).toFixed(2) || 0
        },
        {
            field: 'NetAmount',
            headerName: 'Net Amount',
            width: 250,
            renderCell: (params) =>
                params.row.PurchaseReturnData?.reduce((sum, item) => sum + Number(item.netAmunt), 0).toFixed(2) || 0
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

export default PurchaseReturnList