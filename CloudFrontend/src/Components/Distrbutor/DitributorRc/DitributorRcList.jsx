import axios from 'axios';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

import { fetchVendor } from "../../../Redux/Reducers/VendorReducer"

import { fetchproduct } from '../../../Redux/Reducers/ProductReducer';
import { fetchLocation } from '../../../Redux/Reducers/LocationReducer';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import { fetchRc } from '../../../Redux/Reducers/RcReducer';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const DitributorRcList = () => {
    const [rows, setRows] = useState();
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const id = "687e14a624a274d5e844be49"
    const [loading, setLoading] = useState(false);
    const [selectedId, setSelectedId] = useState(null);
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const canEditRc = (UserRihts || []).includes("Edit Distributor RC")
    const category = useSelector((state) => state.Category.category)
    const Vendor = useSelector((state) => state.Vendor.state)
    const Store = useSelector((state) => state.Store.Store)
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

    //console.log(Store)
    const RC = useSelector((state) => state.RC.Rc)


    const getData = async () => {
        setLoading(true)
        try {


            let data
            if (loginVendor.userType == "1"){
                //console.log(`Rc/RcByVend/${loginVendor.Vendor[0]}`)
                data = await getDataFundtion(`Rc/RcByVend/${loginVendor.Vendor[0]}`)

            }
            else{
                data = await getDataFundtion(`/Rc`)
            }
            const vendor = await getDataFundtion("/vendor")
            const product = await getDataFundtion("/product")
            const loction = await getDataFundtion('/Location')
            const Store = await getDataFundtion("/store")
            const Accounts = await getDataFundtion('/ChartofAccounts')
            const res = await getDataFundtion(`/Administrative/get/${id}`)
            const adminData = res.data
            dispatch(fetchAdminReducer(adminData))
            const list = data.data
            const RCSorted = [...list].sort((a, b) => a.RC - b.RC)
            //console.log(RCSorted)
            dispatch(fetchChartofAccounts(Accounts.data))
            dispatch(fetchproduct(product.data));
            dispatch(fetchLocation(loction.data))
            dispatch(fetchStore(Store.data))
            dispatch(fetchVendor(vendor.data))
            dispatch(fetchRc(RCSorted))
            setLoading(false)
            setRows(list)
        } catch (err) {
            //console.log(err)
        }

    }
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

    const handleEditClick = (id) => {
        if (id._id == null) {

            console.log(RC)

            const isPost = RC.find((item) => item._id == id).PostStatus
            if (isPost == "true") {
                return toast.error('first unpost for edit')
            }
            else {
                navigate(`/RCEdit/${id}`)

            }
        }
        else {

            const isPost = RC.find((item) => item._id == id._id).PostStatus
            if (isPost == true) {
                return toast.error('first unpost for edit')
            }
            else {
                navigate(`/RCEdit/${id}`)

            }
        }
    };
    const handleViewClick = (id) => {
        if (id._id == null) {
            navigate(`/RCView/${id}`)
        }
        else {
            navigate(`/RCView/${id._id}`)
        }
    }
    const handleDeleteClick = (id) => {
        const isPost = RC.find((item) => item._id == id).PostStatus
        if (isPost == true) {
            return toast.error('first unpost for delete')
        }
        else {

            setSelectedId(id);
            setOpenDeleteDialog(true);
        }
    };

    const handleConfirmDelete = async () => {
        setOpenDeleteDialog(false);

        setRows(rows.filter((row) => row._id !== selectedId));
        deleteDataFunction(`RC/RCDelete/${selectedId}`)

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
    const columns = [
        {
            field: 'RcDate',
            headerName: 'RCDate',
            width: 200,
            renderCell: (params) => formatDate(params.value), // Use .value
        },
        {
            field: 'RcCode',
            headerName: 'Rc Number #',
            width: 200,
        },
        
        {
            field: 'SalesFlowRef',
            headerName: 'Ref',
            width: 200,
        },
        {
            field: 'Vendor',
            headerName: 'Vendor',
            width: 200,
            renderCell: (params) => {
                const vendor1 = Vendor.find(vendor => vendor._id === params.value);
                return vendor1 ? `${vendor1.VendorName} (${vendor1.code})` : 'Vendor Not Found';
            },
        },
        {
            field: 'Total Products',
            headerName: 'Total Products',
            width: 250,
            renderCell: (params) => params?.row?.RcData?.length || 0,
        },
        {
            field: 'PostStatus',
            headerName: 'Status',
            width: 250,
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
                ...(canEditRc ? [
                    <GridActionsCellItem
                        icon={<EditIcon />}
                        label="Edit"
                        onClick={() => handleEditClick(id)}
                    />,
                ] : []),
                // <GridActionsCellItem
                //   icon={<DeleteIcon />}
                //   label="Delete"
                //   onClick={() => handleDeleteClick(id)}
                //   color="error"
                // />,
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
                rowsPerPageOptions={[5]}
                loading={loading}
                experimentalFeatures={{ newEditingApi: true }}
                getRowId={(row) => row._id} // <-- tell DataGrid which field is ID
                onRowDoubleClick={(params) => handleViewClick(params.row)} // pass the row
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

export default DitributorRcList