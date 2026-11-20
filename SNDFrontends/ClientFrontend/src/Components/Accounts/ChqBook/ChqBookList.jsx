import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import axios, { all } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchVendor } from "../../../Redux/Reducers/VendorReducer"
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion, updateDataFunction } from "../../../Api/CurdFunctions"
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { fetchChqBook } from '../../../Redux/Reducers/ChqBookReducer';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import VisibilityIcon from '@mui/icons-material/Visibility';

const ChqBookList = () => {
    const [rows, setRows] = useState([]);
    const [deleteR, setdeleteR] = useState(false)
    const dispatch = useDispatch()
    const [selectedId, setSelectedId] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openStatusDialog, setOpenStatusDialog] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('');
    const [selectedRowId, setSelectedRowId] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    
    const navigate = useNavigate()
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

    const getData = async () => {
        try {

            const data = await getDataFundtion(`/customerChq/${loginVendor._id}`)
            const Client = await getDataFundtion(`/Customor/AllCutomerByDis/${loginVendor._id}`)
            console.log(Client)
            const allData = data.data.map((item) => ({
                ...item,
                Customer: Client.data.find((cus) => cus._id == item.Customer)?.CustomorName || ""
            }))
            setRows(allData)

            // Optional: Dispatch to Redux if needed
            // dispatch(fetchChqBook(data.data));
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to fetch cheque data");
        }
    }

    useEffect(() => {
        getData()
    }, [])

    const handleEditClick = (id) => {
        console.log(id)
        navigate(`/ChqBookEdit/${id}`)
    };

    const handleStatusClick = (id, currentStatus) => {
        setSelectedRowId(id);
        setSelectedStatus(currentStatus);
        setOpenStatusDialog(true);
    };

    const handleStatusChange = async () => {
        try {
            const row = rows.find((item) => item._id === selectedRowId)
            row.Status = selectedStatus
            row.ReailizeDate = selectedDate,
            console.log(row)
            
            await updateDataFunction(`/customerChq/Custumer/${selectedRowId}` , row)
            const newRos = rows.filter((item) => item._id !== selectedRowId)
            setRows(newRos)
            setOpenStatusDialog(false)
        } catch (err) {
            console.log(err)
        }
    };

    const columns = [
        {
            field: 'ChqNumber',
            headerName: 'Cheque Number',
            width: 150
        },
        {
            field: 'DisSalesInvoice',
            headerName: 'Sales Invoice',
            width: 150
        },
        {
            field: 'Amount',
            headerName: 'Amount',
            width: 130,
            renderCell: (params) => {
                return `Rs. ${parseFloat(params.value).toLocaleString()}`;
            }
        },
        {
            field: 'ChqDate',
            headerName: 'Cheque Date',
            width: 130
        },
        {
            field: 'Customer',
            headerName: 'Customer',
            width: 200
        },
        {
            field: 'Status',
            headerName: 'Status',
            width: 120,
            renderCell: (params) => {
                const status = params.value;
                const statusColor = status === 'Pending' ? '#ff9800' : status === 'Cleared' ? '#4caf50' : '#f44336';
                return (
                    <span style={{
                        backgroundColor: statusColor,
                        color: 'white',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '12px'
                    }}>
                        {status}
                    </span>
                );
            }
        },
        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 180,
            getActions: ({ id, row }) => [
                
                <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleStatusClick(id, row.Status)}
                    style={{ textTransform: 'none' }}
                >
                    Update Status
                </Button>
            ],
        },
    ];

    // Calculate summary statistics
    const totalAmount = rows?.reduce((sum, row) => sum + parseFloat(row.Amount), 0) || 0;
    const pendingCount = rows?.filter(row => row.Status === 'Pending').length || 0;
    const clearedCount = rows?.filter(row => row.Status === 'Cleared').length || 0;
    const BounceCount = rows?.filter(row => row.Status === 'Bounce').length || 0;

    return (
        <div style={{ margin: 20, height: "70%", width: '80vw' }}>
            <ToastContainer />

            {/* Summary Cards */}
            <div style={{
                display: 'flex',
                gap: '20px',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px'
            }}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3>Total Records</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{rows?.length || 0}</p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3>Total Amount</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                        Rs. {totalAmount.toLocaleString()}
                    </p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3>Pending</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff9800' }}>
                        {pendingCount}
                    </p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3>Cleared</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                        {clearedCount}
                    </p>
                </div>
                <div style={{ flex: 1, textAlign: 'center' }}>
                    <h3>Bounce</h3>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f44336' }}>
                        {BounceCount}
                    </p>
                </div>
            </div>

            <DataGrid
                rows={rows || []}
                columns={columns}
                pageSize={5}
                getRowId={(row) => row._id}
                rowsPerPageOptions={[5, 10, 25]}
                experimentalFeatures={{ newEditingApi: true }}
                autoHeight
            />

            {/* Status Update Dialog */}
            <Dialog
                open={openStatusDialog}
                onClose={() => setOpenStatusDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Update Cheque Status</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel id="status-select-label">Status</InputLabel>
                        <Select
                            labelId="status-select-label"
                            value={selectedStatus}
                            label="Status"
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <MenuItem value="Pending">Pending</MenuItem>
                            <MenuItem value="Cleared">Cleared</MenuItem>
                            <MenuItem value="Bounce">Bounce</MenuItem>
                        </Select>
                        <label >Date</label>
                        <input type='Date' onChange={(e)=> setSelectedDate(e.target.value)} />
                        
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenStatusDialog(false)}>Cancel</Button>
                    <Button onClick={handleStatusChange} color="primary" variant="contained">
                        Update Status
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
            >
                <DialogTitle>Confirm Delete?</DialogTitle>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default ChqBookList