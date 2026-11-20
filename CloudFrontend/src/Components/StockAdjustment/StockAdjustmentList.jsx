import { useEffect, useState } from 'react';
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
import { deleteDataFunction, getDataFundtion, updateDataFunction, createDataFunction } from '../../Api/CRUDFunctions';
import { useLoader } from '../../hooks/useLoader.jsx';
import { useDispatch, useSelector } from 'react-redux';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer.js';

const StockAdjustmentList = () => {
    const { loading, showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();
    const Admin = useSelector((state) => state.AdminReducer.AdminReducer);
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const DeleteRight = "Delete Stock Adjustment"
    const EditRight = "Edit Stock Adjustment"
    const DeleteStockAdjustment = UserRihts.find((item) => item == DeleteRight)
    const EditStockAdjustment = UserRihts.find((item) => item == EditRight)
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [rows, setRows] = useState([]);
    const navigate = useNavigate();
  const dispatch = useDispatch()

    const getData = async () => {
        showLoader('Loading Stock Adjustment...');
        try {
            updateProgress(50);
            const response = await getDataFundtion('/StockAdjustment');
            const Product = await getDataFundtion("product")
            dispatch(fetchproduct(Product.data))
            updateProgress(100);
            setRows(response.data);
        } catch (err) {
            console.error(err);
        } finally {
            hideLoader();
        }
    };

    useEffect(() => {
        getData();
    }, []);

    const handleEditClick = (id) => {
        const row = rows.find((item) => item._id === id);
        if (row?.PostStatus === true) {
            return toast.error('First unpost to edit');
        }
        navigate(`/StockAdjustmentEdit/${id}`);
    };

    const handleViewClick = (id) => {
        navigate(`/StockAdjustmentView/${id}`);
    };

    const handleDeleteClick = (id) => {
        const row = rows.find((item) => item._id === id);
        if (row?.PostStatus === true) {
            return toast.error('First unpost to delete');
        }
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);
        try {
            await deleteDataFunction(`/StockAdjustment/StockAdjustmentDelete/${selectedId}`);
            setRows(rows.filter((row) => row._id !== selectedId));
            toast.success("Deleted successfully");
        } catch (err) {
            toast.error("Delete failed");
        }
    };

    const handlePost = async (id) => {
        const row = rows.find((item) => item._id === id);
        try {
            showLoader('Posting...');
            await updateDataFunction(`/StockAdjustment/ChangeStatus/${id}`, {
                AdjustmentData: row.AdjustmentData,
                Store: row.Store,
                Location: row.Location,
                status: true
            });

            // Calculate total add and less amounts
            const totalAddAmount = (row.AdjustmentData || []).reduce(
                (sum, item) => sum + (parseFloat(item.addAmount) || 0), 0
            );
            const totalLessAmount = (row.AdjustmentData || []).reduce(
                (sum, item) => sum + (parseFloat(item.lessAmount) || 0), 0
            );

            // Create voucher if amounts differ
            if (totalAddAmount !== totalLessAmount) {
                const difference = Math.abs(totalAddAmount - totalLessAmount);
                const isAddMore = totalAddAmount > totalLessAmount;

                const voucherData = {
                    VoucherType: "SA",
                    VoucherDate: row.AdjustmentDate,
                    status: "Post",
                    Allow: "Yes",
                    Narration: `Stock Adjustment Voucher - Adj #${row.AdjustmentNumber || id}`,
                    VoucharData: [
                        {
                            Account: Admin.finishedGoods,
                            Debit: isAddMore ? difference : 0,
                            Credit: isAddMore ? 0 : difference,
                            store: row.Store,
                        },
                        {
                            Account: Admin.ShortageandAccessStock,
                            Debit: isAddMore ? 0 : difference,
                            Credit: isAddMore ? difference : 0,
                            store: row.Store,
                        }
                    ].filter(
                        item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
                    )
                };

                await createDataFunction("/Voucher/createSystemVoucher", voucherData);
            }

            toast.success("Posted successfully");
            getData();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Post failed");
        } finally {
            hideLoader();
        }
    };

    const handleUnpost = async (id) => {
        const row = rows.find((item) => item._id === id);
        try {
            showLoader('Unposting...');
            await updateDataFunction(`/StockAdjustment/ChangeStatus/${id}`, {
                AdjustmentData: row.AdjustmentData,
                Store: row.Store,
                Location: row.Location,
                status: false
            });

            // Reverse voucher on unpost
            const totalAddAmount = (row.AdjustmentData || []).reduce(
                (sum, item) => sum + (parseFloat(item.addAmount) || 0), 0
            );
            const totalLessAmount = (row.AdjustmentData || []).reduce(
                (sum, item) => sum + (parseFloat(item.lessAmount) || 0), 0
            );

            if (totalAddAmount !== totalLessAmount) {
                const difference = Math.abs(totalAddAmount - totalLessAmount);
                const isAddMore = totalAddAmount > totalLessAmount;

                const voucherData = {
                    VoucherType: "SA",
                    VoucherDate: row.AdjustmentDate,
                    status: "Unpost",
                    Allow: "Yes",
                    Narration: `Stock Adjustment Reverse Voucher - Adj #${row.AdjustmentNumber || id}`,
                    VoucharData: [
                        {
                            Account: Admin.finishedGoods,
                            Debit: isAddMore ? 0 : difference,
                            Credit: isAddMore ? difference : 0,
                            store: row.Store,
                        },
                        {
                            Account: Admin.shortageAccount,
                            Debit: isAddMore ? difference : 0,
                            Credit: isAddMore ? 0 : difference,
                            store: row.Store,
                        }
                    ].filter(
                        item => (item.Debit ?? 0) !== 0 || (item.Credit ?? 0) !== 0
                    )
                };

                await createDataFunction("/Voucher/createSystemVoucher", voucherData);
            }

            toast.success("Unposted successfully");
            getData();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Unpost failed");
        } finally {
            hideLoader();
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(",", "");
    };

    const columns = [
        {
            field: 'AdjustmentDate',
            headerName: 'Date',
            width: 150,
            renderCell: (params) => formatDate(params.value),
        },
        {
            field: 'AdjustmentNumber',
            headerName: 'Adj. Number',
            width: 150,
        },
        {
            field: 'SalesFlowRef',
            headerName: 'Sales Flow Ref',
            width: 150,
        },
        {
            field: 'AdjustmentData',
            headerName: 'Total Products',
            width: 130,
            renderCell: (params) => params?.row?.AdjustmentData?.length || 0,
        },
        {
            field: 'PostStatus',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${params.value ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {params.value ? 'Posted' : 'Unposted'}
                </span>
            ),
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 250,
            getActions: ({ id }) => {
                const row = rows.find((r) => r._id === id);
                const isPosted = row?.PostStatus;
                return [
                    <GridActionsCellItem
                        icon={<VisibilityIcon />}
                        label="View"
                        onClick={() => handleViewClick(id)}
                    />,
                    ...(EditStockAdjustment ? [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleEditClick(id)}
                        disabled={isPosted}
                    />,
                    ] : []),
                    ...(DeleteStockAdjustment ? [
                    <GridActionsCellItem
                        icon={<DeleteIcon />}
                        label="Delete"
                        onClick={() => handleDeleteClick(id)}
                        color="error"
                        disabled={isPosted}
                    />,
                    ] : []),
                    <GridActionsCellItem
                        icon={
                            <span className={`text-xs font-bold ${isPosted ? 'text-orange-600' : 'text-green-600'}`}>
                                {isPosted ? 'UNPOST' : 'POST'}
                            </span>
                        }
                        label={isPosted ? 'Unpost' : 'Post'}
                        onClick={() => isPosted ? handleUnpost(id) : handlePost(id)}
                    />,
                ];
            },
        },
    ];

    return (
        <div className="pd-page">
            <div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
                <LoaderComponent />
                <ToastContainer />
                <DataGrid
                    rows={rows}
                    columns={columns}
                    pageSize={[100]}
                    getRowId={(row) => row._id}
                    disableSelectionOnClick
                />
                <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                    <DialogTitle>Confirm Delete?</DialogTitle>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                        <Button onClick={handleConfirmDelete} color="error">Delete</Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>
    );
};

export default StockAdjustmentList;
