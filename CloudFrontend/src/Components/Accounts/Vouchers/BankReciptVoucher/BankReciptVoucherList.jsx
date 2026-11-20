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
import { fetchChqBook } from '../../../../Redux/Reducers/ChqBookReducer';
import { fetchStore } from '../../../../Redux/Reducers/StoreReducer';
import { fetchRemaininginvoice } from '../../../../Redux/Reducers/Remaininginvoice';

import { useLoader } from '../../../../hooks/useLoader';
import { searchVoucherByNumber } from '../../../Global/searchVoucher';
const BankReciptVoucherList = () => {
    const { loading, showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();

    const [rows, setRows] = useState([]);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [voucherSerarch, setVoucherSerarch] = useState("")
    // const [loading, setLoading] = useState([])
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const UserRihts = useSelector((state) => state.UsersRights.UserRights);
    const canEdit = Array.isArray(UserRihts) && UserRihts.includes("Edit Bank Receipt");
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            showLoader('Loading Bank Receipt Vouchers...');

            try {
                updateProgress(25);
                //console.log("first")
                // Only fetch invoice data for display
                const data = await getDataFundtion("/Voucher?&VoucherType=BR");
                //console.log(data)
                const accounts = await getDataFundtion('/ChartofAccounts')
                updateProgress(50);
                const id = "687e14a624a274d5e844be49"
                const customer = await getDataFundtion("/customer/customerNameid")
                updateProgress(75);
                //console.log(customer)
                const res = await getDataFundtion(`/Administrative/get/${id}`)
                //console.log(res)
                updateProgress(95);
                const chq = await getDataFundtion("/CustomerChqRecived/Allunused")
                const Reamin = await getDataFundtion("/saleInvoice/getOnlyRemainInvoiceAmount")
                const OpeningInvoice = await getDataFundtion("/OpeningInvoice")
                //console.log(OpeningInvoice)
                dispatch(fetchOpeningInvoices(OpeningInvoice.data));
                //console.log(chq)
                const store = await getDataFundtion("/store")
                dispatch(fetchStore(store.data))
                dispatch(fetchChqBook(chq));
                dispatch(fetchRemaininginvoice(Reamin.data))
                dispatch(fetchAdminReducer(res.data))
                dispatch(fetchClient(customer.data))
                //console.log(res.data)
                dispatch(fetchChartofAccounts(accounts.data))
                setRows(data.data || []);
                
                dispatch(fetchVoucher(data.data || []));
                
                updateProgress(100)
                // Preload customers only once
                hideLoader()
            } catch (error) {
                toast.error("Failed to load data");
                console.error(error);
            } finally {
                hideLoader();
            }
        };

        fetchData();
    }, [dispatch]);

    const handleEditClick = (id) => {
        navigate(`/BankReciptVoucherEdit/${id}`);
    };

    const handleViewClick = (id) => {
        //console.log(`BankReciptVoucherView/${id}`);
        navigate(`/BankReciptVoucherView/${id}`);
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
                    onClick={() => navigate((`/BankReciptVoucherView/${params.row._id}`))}
                >
                    {params.value}
                </span>
            )
        },
        {
            field: 'VoucherMainAccount', headerName: 'Voucher Account', width: 360,
            renderCell: (params) => Accounts.find((item) => item._id == params.value)?.AccountName || 0,
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
            field: 'createdBy',
            headerName: 'createdBy',
            width: 100,

        },
        {
            field: 'createDate',
            headerName: 'createDate',
            width: 100,

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
                ...(canEdit
                    ? [
                        <GridActionsCellItem
                            icon={<EditIcon />}
                            label="Edit"
                            onClick={() => handleEditClick(id)}
                        />,
                    ]
                    : []),
                // <GridActionsCellItem
                //     icon={<DeleteIcon />}
                //     label="Delete"
                //     onClick={() => handleDeleteClick(id)}
                //     color="error"
                // />
            ],
        },
    ];
    const SearchVoucher = async () => {
        const data = await searchVoucherByNumber({ number: voucherSerarch, voucherType: 'BR' });
        setRows(data);
        dispatch(fetchVoucher(data || []));
    }
    return (
        <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
            <LoaderComponent />
            <ToastContainer />
            <input
                type="text"
                placeholder="SearchByVocuher"
                onChange={(e) => setVoucherSerarch(e.target.value)}
                style={{
                    marginBottom: 10,

                    padding: 8,
                    width: 300,
                    borderRadius: 5,
                    border: "1px solid #ccc"
                }}
            />


            <button
                onClick={() => SearchVoucher()}
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2 focus:outline-none">
                submit
            </button>
            <DataGrid
                rows={rows}
                columns={columns}
                // loading={loading}
                pageSize={5}
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

export default BankReciptVoucherList;
