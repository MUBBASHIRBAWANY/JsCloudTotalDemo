import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../../Api/CRUDFunctions';
import { fetchClient } from '../../../../Redux/Reducers/ClientReducer';
import { fetchOpeningInvoices } from '../../../../Redux/Reducers/OpeningInvoicesReducer';
import { fetchChartofAccounts } from '../../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { fetchAdminReducer } from '../../../../Redux/Reducers/AdminReducer';
import { fetchVendor } from '../../../../Redux/Reducers/VendorReducer';
import { fetchChqBook } from '../../../../Redux/Reducers/ChqBookReducer';
import { fetchStore } from '../../../../Redux/Reducers/StoreReducer';

const CashVoucherList = () => {
    const [rows, setRows] = useState([]);
    const [loading , setLoading] = useState([])
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                // Only fetch invoice data for display
                const AdminiD = "68903ec2664155e11db10367"
                const Admmin = await getDataFundtion(`/Administrative/get/${AdminiD}`)
                const Brdata = await getDataFundtion("/Voucher?&VoucherType=CR");
                const Bpdata = await getDataFundtion("/Voucher?&VoucherType=CP");
                const accounts = await getDataFundtion('/ChartofAccounts')
                
                const data = Brdata.data.concat(Bpdata.data)
                dispatch(fetchAdminReducer(Admmin.data))
                dispatch(fetchChartofAccounts(accounts.data))
                setRows(data || []);
                dispatch(fetchVoucher(data || []));


                // Preload customers only once
                const { data: customerData } = await getDataFundtion("/Customor");
                dispatch(fetchClient(customerData));
            } catch (error) {
                toast.error("Failed to load data");
                console.error(error);
            }
            setLoading(false)
        };

        fetchData();
    }, [dispatch]);

    const handleEditClick = (id) => {
        navigate(`/CashVoucherEdit/${id}`);
    };

    const handleViewClick = (id) => {
        //console.log(`BankPaymentVoucherView/${id}`);
        navigate(`/BankPaymentVoucherView/${id}`);
    };

    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteDataFunction(`/Voucher/delete/${selectedId}`);
            setRows(prev => prev.filter(row => row._id !== selectedId));
            toast.success("Deleted successfully");
        } catch (error) {
            toast.error("Failed to delete");
            console.error(error);
        } finally {
            setOpenDeleteDialog(false);
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
        { field: 'VoucherDate', headerName: 'Date Start', width: 150, renderCell: (params) => formatDate(params.value) },
        { field: 'VoucherType', headerName: 'Voucher Type', width: 150, },
        {
            field: 'VoucherNumber', headerName: 'Voucher Number', width: 150, renderCell: (params) => (
                <span style={{ color: `#1976d2`, textDecoration: 'underline', cursor: "pointer" }}
                    onClick={() => navigate((`/BankPaymentVoucherView/${params.row._id}`))}
                >
                    {params.value}
                </span>
            )
        },
        {
            field: 'DebitAccount', headerName: 'Voucher Account', width: 360,
            renderCell: (params) => Accounts.find((item) => item._id == params.value)?.AccountName || Accounts.find((item) => item._id == params.row.CreditAccount)?.AccountName ,
        },
        { field: 'status', headerName: 'Status', width: 150, },
        {
            field: 'DebitTotal',
            headerName: 'Debit',
            width: 150,
            renderCell: (params) => {
                const rows = Array.isArray(params.row.VoucharData) ? params.row.VoucharData : [];
                const total = rows.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
                return total.toFixed(2);
            }
        },
        {
            field: 'CreditTotal',
            headerName: 'Credit',
            width: 150,
            renderCell: (params) => {
                const rows = Array.isArray(params.row.VoucharData) ? params.row.VoucharData : [];
                const total = rows.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
                return total.toFixed(2);
            }
        },
        {
            field: 'Narration',
            headerName: 'Narration',
            width: 200,
            renderCell: (params) => {
                const rows = Array.isArray(params.row.VoucharData) ? params.row.VoucharData : [];
                return rows[0]?.Narration || '';
            }
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 150,
            getActions: ({ id }) => [
                <GridActionsCellItem
                    icon={<VisibilityIcon />}
                    label="View"
                    onClick={() => handleViewClick(id)}
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
                />
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
                loading={loading}
                getRowId={(row) => row._id}
                rowsPerPageOptions={[5]}
                disableRowSelectionOnClick
            />

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Delete?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </div></div>
    );
};

export default CashVoucherList;
