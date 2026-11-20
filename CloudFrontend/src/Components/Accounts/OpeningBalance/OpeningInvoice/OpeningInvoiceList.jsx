import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../../Api/CRUDFunctions';
import { fetchClient } from '../../../../Redux/Reducers/ClientReducer';
import { fetchOpeningInvoices } from '../../../../Redux/Reducers/OpeningInvoicesReducer';
import { fetchOrderBooker } from '../../../../Redux/Reducers/OrderBookerReducer';

const OpeningInvoiceList = () => {
    const [rows, setRows] = useState([]);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Only fetch invoice data for display
                const { data: invoiceData } = await getDataFundtion("/OpeningInvoice");
                setRows(invoiceData);
                // Optionally fetch once if Redux is empty (not every time)
                const orderBooker = await getDataFundtion("/OrderBooker")
                dispatch(fetchOrderBooker(orderBooker.data))
                dispatch(fetchOpeningInvoices(invoiceData));

                // Preload customers only once
                const { data: customerData } = await getDataFundtion("/customer");
                dispatch(fetchClient(customerData));
            } catch (error) {
                toast.error("Failed to load data");
                console.error(error);
            }
        };

        fetchData();
    }, [dispatch]);

    const handleEditClick = (id) => {
        navigate(`/InvoiceOpeningEdit/${id}`);
    };

    const handleViewClick = (id) => {
        navigate(`/InvoiceOpeningView/${id}`);
    };

    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        try {
            await deleteDataFunction(`/OpeningInvoice/Deleteopening/${selectedId}`);
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
        { field: 'DateStart', headerName: 'Date Start', width: 150, renderCell: (params) => formatDate(params.value) },
        { field: 'DateEnd', headerName: 'Date End', width: 150, renderCell: (params) => formatDate(params.value) },
        {
            field: 'InvoiceData', headerName: 'Total Invoices', width: 160,
            renderCell: (params) => params.value?.length || 0,
        },
        {
            field: 'Status', headerName: 'Status', width: 150,
            renderCell: (params) => {
                switch (params.value) {
                    case "Open": return "Open";
                    case "UnPost": return "UnPost";
                    case "Close": return "Close";
                    default: return "Unknown";
                }
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

export default OpeningInvoiceList;
