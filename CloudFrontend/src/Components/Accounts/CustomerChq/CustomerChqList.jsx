import React, { useEffect, useState } from 'react';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import axios, { all } from 'axios';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { fetchVendor } from "../../../Redux/Reducers/VendorReducer"
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from "../../../Api/CRUDFunctions"
import VisibilityIcon from '@mui/icons-material/Visibility';
import { fetchSalesInvoice } from '../../../Redux/Reducers/SalesInvoiceReducer';
import { fetchcustomerChq } from '../../../Redux/Reducers/CustomerChqReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchOpeningInvoices } from '../../../Redux/Reducers/OpeningInvoicesReducer';


const CustomerChqList = () => {
    const [rows, setRows] = useState([]);
    const [deleteR, setdeleteR] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const dispatch = useDispatch()
    const [selectedId, setSelectedId] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [client, setClient] = useState('')
    const [searchText, setSearchText] = useState('');
    const [allRows, setAllRows] = useState([]);
    const navigate = useNavigate()
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);

    const getData = async () => {
        try {
            const data = await getDataFundtion("/CustomerChqRecived")
            const invoice = await getDataFundtion("/saleInvoice/getOnlyRemainInvoiceAmount")
            const Client = await getDataFundtion("/Customer/customerNameid")
            const OpeningInvoice = await getDataFundtion("/OpeningInvoice")
            const wholedata = data?.data.map((item) => {
                const bankNames = [
                    ...(item.table || []),
                    ...(item.grouped || []).flatMap((g) => [g, ...(g.items || [])]),
                ]
                    .map((row) => String(row?.BankName ?? row?.bankName ?? row?.Bank ?? row?.bank ?? "").trim())
                    .filter((name) => name && name !== "—" && name !== "-" && !/^[a-fA-F0-9]{24}$/.test(name));
                const uniqueBanks = [...new Set(bankNames)];

                return {
                    ...item,
                    Customer: Client.data.find((cs) => cs._id === item.Customer)?.CutomerName || item.Customer,
                    Chq: (item.grouped || []).flatMap((ch) => ch.chq).join(""),
                    BankName: uniqueBanks.length ? uniqueBanks.join(", ") : "N/A",
                    Amount: (item.table || []).reduce((sum, val) => sum + (parseFloat(val.Amount) || 0), 0),
                };
            })

            dispatch(fetchOpeningInvoices(OpeningInvoice.data));
            dispatch(fetchSalesInvoice(invoice.data));
            dispatch(fetchcustomerChq(data.data))
            dispatch(fetchClient(Client.data))
            setRows(wholedata)
            setAllRows(wholedata)
            setClient(Client.data)
            setIsLoading(false)
        }
        catch (err) {
            //console.log(err)
        }
        finally {
            setIsLoading(false); // ✅ Always stop loading
        }


    }

    const handleViewClick = (id) => {
        navigate(`/CustomerChqView/${id}`)
    }



    useEffect(() => {
        getData()
    }, [])



    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);
        //console.log(selectedId)
        setRows(rows.filter((row) => row._id !== selectedId));
        let getCatByVendor = await deleteDataFunction(`/CustomerChqRecived/delete/${selectedId}`)


        // //console.log(res)
    };

    const columns = [
        {
            field: 'code', headerName: 'Customer', width: 250,
        },
        {
            field: 'Customer', headerName: 'Customer', width: 250,
        },

        {
            field: 'Chq', headerName: 'Chq', width: 200,

        },
        {
            field: 'BankName', headerName: 'BankName', width: 180,
            renderCell: (params) => params.row?.BankName || 'N/A',
        },
        {
            field: 'TotalInvoice', headerName: 'TotalInvoice', width: 200,
            renderCell: (params) => {
                return params.row.table.length
            }
        },
        {
            field: 'Amount', headerName: 'TotalNetAmount    ', width: 200,
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
    const handleSearch = (value) => {
        setSearchText(value);

        if (!value) {
            setRows(allRows);
            return;
        }

        const searchValue = value.toLowerCase();

        const filtered = allRows.filter((row) =>
            Object.values(row).some((field) =>
                String(field).toLowerCase().includes(searchValue)
            )
        );

        setRows(filtered);
    };


    return (

        <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
            <ToastContainer />
            <input
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => handleSearch(e.target.value)}
                style={{
                    marginBottom: 10,
                    padding: 8,
                    width: 300,
                    borderRadius: 5,
                    border: "1px solid #ccc"
                }}
            />
            <DataGrid
                rows={rows}
                columns={columns}
                pageSize={5}
                loading={isLoading}
                getRowId={(row) => row._id}
                rowsPerPageOptions={[5]}
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

    );
}

export default CustomerChqList