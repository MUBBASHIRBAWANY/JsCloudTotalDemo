import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import * as XLSX from 'xlsx';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import { buildDcListRows, canDeleteDc } from './dcList.js';
import { fetchOrderDc } from '../../../Redux/Reducers/OrderDCReducer.js';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers.js';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer.js';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser.js';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer.js';
import { fetchTotalProducts } from '../../../Redux/Reducers/TotalProductsReducer.js';
import { fetchDistributorOrder } from '../../../Redux/Reducers/DistributorOrderReducer.js';
import { fetchLocation } from '../../../Redux/Reducers/LocationReducer.js';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer.js';
import { fetchTransport } from '../../../Redux/Reducers/TransportReducer.js';
import { fetchCity } from '../../../Redux/Reducers/CityReducer.js';


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
    const Distrbutor = useSelector((state) => state.DistributroReducers.DistributroReducers)

    const Admin = useSelector((state) => state.AdminReducer.AdminReducer)
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
    const OrderDc = useSelector((state) => state.OrderDc.OrderDc)



    const getData = async () => {
        setLoading(true)
        try {
            const AdminiD = "68903ec2664155e11db10367"
            const background = Promise.all([
                getDataFundtion("/Transport"),
                getDataFundtion("/City"),
                getDataFundtion("/Location"),
                getDataFundtion("/DistributorSaleOrder"),
                getDataFundtion(`/Administrative/get/${AdminiD}`),
                getDataFundtion("/ChartofAccounts"),
                getDataFundtion("/product"),
                getDataFundtion("/totalProduct"),
            ]).then(([Transport, City, LocationRes, Order, res, Accounts, product, total]) => {
                dispatch(fetchTransport(Transport.data))
                dispatch(fetchCity(City.data))
                dispatch(fetchLocation(LocationRes.data))
                dispatch(fetchDistributorOrder(Order))
                dispatch(fetchAdminReducer(res.data))
                dispatch(fetchChartofAccounts(Accounts.data))
                dispatch(fetchproduct(product.data))
                dispatch(fetchTotalProducts(total.data))
            }).catch((err) => console.log(err))

            const [data, Distributr, storeRes] = await Promise.all([
                getDataFundtion("/DcOrder/list"),
                getDataFundtion("/Distrbutor/DistrbutorNameId"),
                getDataFundtion("/Store"),
            ])
            dispatch(fetchDistributroReducers(Distributr))
            dispatch(fetchStore(storeRes.data))
            dispatch(fetchOrderDc(data))
            setRows(buildDcListRows(data, Distributr))
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

    const handleViewClick = (id) => {
        navigate(`/OrderDCView/${id}`)
    }
    const handleDeleteClick = (id) => {
        const check = rows.find((item) => item._id == id)
        if (canDeleteDc(check)) {
            setSelectedId(id);
            setOpenDeleteDialog(true);
        }
        else {
            toast.error("Plese make first as False")
        }


    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);

        try {
            await deleteDataFunction(`DcOrder/deleteSaleOrderDC/${selectedId}`)
            setRows(rows.filter((row) => row._id !== selectedId));
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
    const exportToExcel = async () => {
        if (!rows || rows.length === 0) {
            toast.error("No data to export");
            return;
        }
        let exportRows = rows;
        if (!rows.some((order) => Array.isArray(order.DCData))) {
            try {
                exportRows = await getDataFundtion("/DcOrder");
            } catch (err) {
                console.log(err);
                toast.error("Could not load DC lines for Excel");
                return;
            }
        }

        const excelData = [];
        exportRows.forEach((order) => {
            const headerStore = Store.find((s) => s._id === order.Store);
            const distributor = Distrbutor.find((d) => d._id === order.Distrbutor);
            const distributorName = distributor
                ? `${distributor.DistrbutorName} ${distributor.OldCode || ""}`.trim()
                : (order.Distrbutor || "");

            const lineItems = order.DCData && order.DCData.length > 0 ? order.DCData : [{}];

            lineItems.forEach((item) => {
                const product = Prod.find((p) => p._id === item.product);

                excelData.push({
                    "DC Date": order.DCDate ? formatDate(order.DCDate) : "",
                    "DC #": order.DCCode || "",
                    "Distributor": distributorName,
                    "Store": headerStore ? `${headerStore.StoreName} (${headerStore.code})` : "",
                    "Bilty Number": order.BiltyNumber || "",
                    "Status": order.PostStatus || "",
                    "Order Code": item.Order || "",
                    "Product": product ? product.ProductName : (item.product || ""),
                    "Carton": item.carton ?? "",
                    "Box": item.box ?? "",
                    "Delivered Box": item.DeliveredBox ?? "",
                    "Remaining Box": item.ReamingBox ?? (item.OriginalRemainingBox ?? ""),
                });
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "OrderDC");

        // Auto-size columns
        const colWidths = Object.keys(excelData[0] || {}).map((key) => ({
            wch: Math.max(key.length, ...excelData.map((row) => String(row[key] ?? "").length)) + 2,
        }));
        worksheet["!cols"] = colWidths;

        XLSX.writeFile(workbook, `OrderDC_${new Date().toISOString().slice(0, 10)}.xlsx`);
        toast.success(`${excelData.length} order line(s) downloaded`);
    };

    const columns = [
        {
            field: 'DCDate',
            headerName: 'DcDate',
            width: 150,
            renderCell: (params) => formatDate(params.value), // Use .value
        },
        {
            field: 'DCCode',
            headerName: 'DC #',
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
            field: 'Total Products',
            headerName: 'Total Products',
            width: 250,
            renderCell: (params) => params?.row?.lineCount ?? params?.row?.DCData?.length ?? 0,
        },

        {
            field: 'PostStatus',
            headerName: 'Status',
            width: 200,
            renderCell: (params) => (
                params.value === "False"
                    ? <span style={{ color: '#d32f2f', fontWeight: 600 }}>Cancel</span>
                    : (params.value || "")
            ),
        },
        {
            field: 'BiltyNumber',
            headerName: 'BiltyNumber',
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
            ],
        },
    ];



    return (

        <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
            <ToastContainer />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Order DC</h2>
                <Button
                    variant="contained"
                    color="success"
                    startIcon={<FileDownloadIcon />}
                    onClick={exportToExcel}
                    disabled={!rows || rows.length === 0}
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
        </div></div>
    )
}

export default OrderDCList