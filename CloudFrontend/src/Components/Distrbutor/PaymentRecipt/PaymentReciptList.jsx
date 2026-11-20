import React, { useEffect, useMemo, useState } from 'react';
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
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import { useLoader } from '../../../hooks/useLoader';
import { fetchPaymentRecived } from '../../../Redux/Reducers/PaymentRecivedReducer';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';
import { fetchDitributorInvoice, OnlyRemainInvoice } from '../../../Redux/Reducers/DistributorInvoiceReducer';
import { fetchOpeningInvoices } from '../../../Redux/Reducers/OpeningInvoicesReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';

const isFlagTrue = (value) => value === true || value === "true";
const isDistributorReceipt = (item) => String(item?.forDis ?? "").trim().toLowerCase() === "yes";

const PaymentReciptList = () => {
    const [allRows, setAllRows] = useState([]);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
        const { loading, showLoader, hideLoader, updateProgress, LoaderComponent } = useLoader();
    const [selectedId, setSelectedId] = useState(null);
    const [voucherSerarch, setVoucherSerarch] = useState("")
    
    const Accounts = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const isBoss = isFlagTrue(loginVendor?.isBoss);
    const isDistributor = isFlagTrue(loginVendor?.isDistributor);

    const rows = useMemo(() => {
        if (isBoss) return allRows;
        if (isDistributor) return allRows.filter(isDistributorReceipt);
        return allRows.filter((item) => !isDistributorReceipt(item));
    }, [allRows, isBoss, isDistributor]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                showLoader('Loading Bank Receipt...');
                // Only fetch invoice data for display
                const data = await getDataFundtion("/PaymentRecived");
                //console.log(data, "data")
                const accounts = await getDataFundtion('/ChartofAccounts')
                 updateProgress(50);
                const id = "687e14a624a274d5e844be49"
                const distrbutor = await getDataFundtion("/Distrbutor/DistrbutorNameId")
                const Customer = await getDataFundtion("/customer/customerNameid")
                const OpeningInvoice = await getDataFundtion("/OpeningInvoice")
                updateProgress(75);
                dispatch(fetchOpeningInvoices(OpeningInvoice.data));
                const res = await getDataFundtion(`/Administrative/get/${id}`)
                const store = await getDataFundtion("/store")
                const Disinvoice = await getDataFundtion("/DistrbutorInvoice/getRemainOnly")
                const Reamin = await getDataFundtion("/saleInvoice/getOnlyRemainInvoiceAmount")
                const City = await getDataFundtion("/City")
                const DisinvoiceRemaining = Disinvoice.data.filter((item) => item.Remaining > 1 )
                const ReaminRemaining = Reamin.data.filter((item) => item.RemainingAmount > 1 )
                dispatch(OnlyRemainInvoice(DisinvoiceRemaining.concat(ReaminRemaining)))
                dispatch(fetchCity(City.data))
                dispatch(fetchClient(Customer.data))
                dispatch(fetchStore(store.data))
                dispatch(fetchPaymentRecived(data))
                dispatch(fetchAdminReducer(res.data))
                dispatch(fetchDistributroReducers(distrbutor))
                //console.log(res.data)
                dispatch(fetchChartofAccounts(accounts.data))
                setAllRows(Array.isArray(data) ? data : []);

                updateProgress(100)

                // Preload customers only once
            } catch (error) {
                toast.error("Failed to load data");
                console.error(error);
                

            }
            finally {
             
                hideLoader()
            
            }
        };

        fetchData();
    }, [dispatch]);

    const handleEditClick = (id) => {
        const find = rows.find((item) => item._id === id);
        if (find?.status == "False") {
            navigate(`/PaymentReciptEdit/${id}`);
            return;
        }
        else {
            toast.error("You cannot edit this receipt");
        }
    };

    const handleViewClick = (id) => {
        navigate(`/PaymentReciptView/${id}`);
    };

    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteDataFunction(`/Voucher/delete/${selectedId}`);
            setAllRows(prev => prev.filter(row => row._id !== selectedId));
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
        { field: 'ReciptDate', headerName: 'Recipt Date', width: 150, renderCell: (params) => formatDate(params.value) },
        {
            field: 'ReciptNumber', headerName: 'Voucher Number', width: 150,

        },
        {
            field: 'ReciptMainAccount', headerName: 'Recipt Main Account', width: 360,
            renderCell: (params) => Accounts.find((item) => item._id == params.value)?.AccountName || 0,
        },
        {
            field: 'RejectReson', headerName: 'Reject Reson', width: 360,
        },

        { field: 'status', headerName: 'Status', width: 150, },
        {
            field: 'DebitTotal',
            headerName: 'Debit',
            width: 150,
            renderCell: (params) => {
                const rows = Array.isArray(params.row.ReciptData) ? params.row.ReciptData : [];
                const total = rows.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
                return total.toFixed(2);
            }
        },
        {
            field: 'CreditTotal',
            headerName: 'Credit',
            width: 150,
            renderCell: (params) => {
                const rows = Array.isArray(params.row.ReciptData) ? params.row.ReciptData : [];
                const total = rows.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);
                return total.toFixed(2);
            }
        },
        {
            field: 'Narration',
            headerName: 'Narration',
            width: 350,
            renderCell: (params) => {
                const rows = Array.isArray(params.row.ReciptData) ? params.row.ReciptData : [];
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
                    label="edit"
                    onClick={() => handleEditClick(id)}
                />,
            ],
        },
    ];
    const SearchVoucher = async () => {
        const number = voucherSerarch.replace(/\s+/g, "")
        //console.log(number.length)
        if (number == "") {
            const data = await getDataFundtion("/Voucher?&VoucherType=BR");
            setAllRows(data.data)
        }
        const data = await getDataFundtion(`/Voucher/getOnlyVoucherByNumber/${number}`)
        setAllRows([data.data])
    }
    return (
        <div className='h-[70vh] w-full'>
            <ToastContainer />
<LoaderComponent />
            <DataGrid
                rows={rows}
                loading={loading}
                columns={columns}
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
        </div>
    );
};

export default PaymentReciptList;