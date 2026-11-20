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
import { fetchClient } from '../../../../Redux/Reducers/ClientReducer';
import { fetchOpeningInvoices } from '../../../../Redux/Reducers/OpeningInvoicesReducer';
import { fetchChartofAccounts } from '../../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchVoucher } from '../../../../Redux/Reducers/VoucherReducer';
import { fetchAdminReducer } from '../../../../Redux/Reducers/AdminReducer';
import { fetchVendor } from '../../../../Redux/Reducers/VendorReducer';
import { fetchChqBook } from '../../../../Redux/Reducers/ChqBookReducer';
import { fetchStore } from '../../../../Redux/Reducers/StoreReducer';
import { deleteDataFunction, getDataFundtion } from '../../../../Api/CRUDFunctions';
import { fetchRemaininginvoice } from '../../../../Redux/Reducers/Remaininginvoice';
import { useLoader } from '../../../../hooks/useLoader';
import { fetchDistributroReducers } from '../../../../Redux/Reducers/DistributroReducers';
import { searchVoucherByNumber } from '../../../Global/searchVoucher';

const CashReciptVoucherList = () => {
    const { loading, showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();

    const [rows, setRows] = useState([]);
    // const [loading, setLoading] = useState([])
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const [voucherSerarch, setVoucherSerarch] = useState("")
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const AdminReducer = useSelector((state) => state.AdminReducer.AdminReducer)
    const Client = useSelector((state) => state.Client.client)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const UserRihts = useSelector((state) => state.UsersRights.UserRights);
    const canEdit = Array.isArray(UserRihts) && UserRihts.includes("Edit Cash Receipt");
    
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            showLoader('Loading Cash Receipt Vouchers...');
            try {
                // Only fetch invoice data for display
                updateProgress(50);
                if (AdminReducer.length === 0) {
                    const AdminiD = "687e14a624a274d5e844be49"
                    const Admmin = await getDataFundtion(`/Administrative/get/${AdminiD}`)
                    dispatch(fetchAdminReducer(Admmin.data))
                }
                const Brdata = await getDataFundtion("/Voucher?&VoucherType=CR");
                if (Accounts.length == 0) {
                    const accounts = await getDataFundtion('/ChartofAccounts')
                    dispatch(fetchChartofAccounts(accounts.data))
                }
                const Reamin = await getDataFundtion("/saleInvoice/getOnlyRemainInvoiceAmount")
                //console.log("Reamin")
                const distrbutor = await getDataFundtion("/Distrbutor/DistrbutorNameId")
                dispatch(fetchDistributroReducers(distrbutor))
                updateProgress(100);
                const OpeningInvoice = await getDataFundtion("/OpeningInvoice/onlyRemain")
                //console.log("OpeningInvoice")
                dispatch(fetchOpeningInvoices(OpeningInvoice.data));
                const data = Brdata.data
                dispatch(fetchRemaininginvoice(Reamin.data))
                setRows(data || []);
                dispatch(fetchVoucher(data || []));
                // updateProgress(75);


                // Preload customers only once
                if (Client.length == 0) {
                    const customerData = await getDataFundtion("/customer/customerNameid");
                    dispatch(fetchClient(customerData.data));
                }
                // updateProgress(100)

                setTimeout(hideLoader, 500);
            } catch (error) {
                toast.error("Failed to load data");
                console.error(error);
            } finally {
                hideLoader();
            }
            // setLoading(false)
        };

        fetchData();
    }, [dispatch]);

    const SearchVoucher = async () => {
        const data = await searchVoucherByNumber({ number: voucherSerarch, voucherType: 'CR' });
        setRows(data);
        dispatch(fetchVoucher(data || []));
    }

    const handleEditClick = (id) => {
        navigate(`/CashReciptVoucherEdit/${id}`);
    };

    const handleViewClick = (id) => {
        //console.log(`BankPaymentVoucherView/${id}`);
        navigate(`/CashReciptVoucherView/${id}`);
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
                    onClick={() => navigate((`/CashReciptVoucherView/${params.row._id}`))}
                >
                    {params.value}
                </span>
            )
        },
        {
            field: 'DebitAccount', headerName: 'Voucher Account', width: 360,
            renderCell: (params) => Accounts.find((item) => item._id == params.value)?.AccountName || Accounts.find((item) => item._id == params.row.CreditAccount)?.AccountName,
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
            getActions: ({ id }) => {
                const actions = [
                    <GridActionsCellItem
                        icon={<VisibilityIcon />}
                        label="View"
                        onClick={() => handleViewClick(id)}
                    />,
                ];
                if (canEdit) {
                    actions.push(
                        <GridActionsCellItem
                            icon={<EditIcon />}
                            label="Edit"
                            onClick={() => handleEditClick(id)}
                        />
                    );
                }
                actions.push(
                    // <GridActionsCellItem
                    //     icon={<DeleteIcon />}
                    //     label="Delete"
                    //     onClick={() => handleDeleteClick(id)}
                    //     color="error"
                    // />
                );
                return actions;
            },
        },
    ];

    return (
        <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
            <LoaderComponent />
            <ToastContainer />
            <input
                type="text"
                placeholder="SearchByVocuher"
                onChange={(e) => setVoucherSerarch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") SearchVoucher(); }}
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

export default CashReciptVoucherList;
