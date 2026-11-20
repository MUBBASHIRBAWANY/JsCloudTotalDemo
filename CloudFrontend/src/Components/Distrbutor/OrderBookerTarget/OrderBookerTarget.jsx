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
import { toast, ToastContainer } from 'react-toastify';

import VisibilityIcon from '@mui/icons-material/Visibility';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchDistributorOrderBooker } from '../../../Redux/Reducers/DistributorOrderBookerReducer';
import { fetchTargetReducer } from '../../../Redux/Reducers/TargetReducer';
import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';




const OrderBookerTarget = () => {
    const [rows, setRows] = useState([]);
    const [deleteR, setdeleteR] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const dispatch = useDispatch()
    const [selectedId, setSelectedId] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [allRows, setAllRows] = useState([]);
    const navigate = useNavigate()

    const getData = async () => {
        try {
            const data = await getDataFundtion("/Target")
            const OrderBooker = await getDataFundtion("/DitriButorOrderBooker")
            const product = await getDataFundtion("/product/getProductNameId")
            dispatch(fetchproduct(product.data));
            const allData = data.data.map((or) => ({
                ...or,
                OrderBooker: OrderBooker.data.find((item) => item._id == or.OrderBooker).OrderBookerName
            }
            ))
            console.log(allData)
            setAllRows(allData)
            setRows(allData)
            dispatch(fetchTargetReducer(data.data))
            dispatch(fetchDistributorOrderBooker(OrderBooker.data))
            setIsLoading(false)

        }
        catch (err) {
            console.log(err)
            toast.error("Something went wrong")
        }
        finally {
            setIsLoading(false); // ✅ Always stop loading
        }


    }

    const handleViewClick = (id) => {
        navigate(`/DistrbutorView/${id}`)
    }



    useEffect(() => {
        getData()
    }, [])



    const handleDeleteClick = (id) => {
        setSelectedId(id);
        setOpenDeleteDialog(true);
    };
    const handleEditClick = (id) => {
        //console.log(id)
        navigate(`/DistrbutorEdit/${id}`)
    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);
        //console.log(selectedId)
        setRows(rows.filter((row) => row._id !== selectedId));
        let getCatByVendor = await deleteDataFunction(`/Distrbutor/deleteDistrbutor/${selectedId}`)


        // //console.log(res)
    };

    const columns = [
        {
            field: 'Code', headerName: 'code', width: 250,
        },
        {
            field: 'OrderBooker', headerName: 'OrderBooker', width: 250,
        },

        {
            field: 'Month', headerName: 'Month', width: 200,

        },

        {
            field: 'actions',
            type: 'actions',
            headerName: 'Actions',
            width: 130,
            getActions: ({ id }) => [
                <GridActionsCellItem
                    icon={<VisibilityIcon />}
                    label="Edit"
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

export default OrderBookerTarget