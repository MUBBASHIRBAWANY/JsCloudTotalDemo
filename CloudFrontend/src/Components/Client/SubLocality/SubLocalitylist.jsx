import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import { toast, ToastContainer } from 'react-toastify';
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchLocality } from '../../../Redux/Reducers/LocalityReducer';
import { fetchSubLocality } from '../../../Redux/Reducers/SubLocalityReducer';
import { SublocaliyData } from '../../Global/ExtractData';

const SubLocalitylist = () => {
 const [rows, setRows] = useState();
   const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
   const [selectedId, setSelectedId] = useState(null);
   const navigate = useNavigate()
   const dispatch = useDispatch()
   const UserRihts = useSelector((state) => state.UsersRights.UserRights)
   const Locality = useSelector((state)=>state.Locality.locality)
 
   const getData = async () => {
     try {
       const data = await getDataFundtion("/subLocality")
       const list = data.data
       const vendor = await getDataFundtion("/Locality")
       dispatch(fetchLocality(vendor.data))
       dispatch(fetchSubLocality(list))
       setRows(list)
     } catch (err) {
       //console.log(err)
     }
 
   }
 
   useEffect(() => {
 
 
     getData()
   }, [])
 
   const handleEditClick = (id) => {
     //console.log(id)
     navigate(`/SubLocalityEdit/${id}`)
   };
 
   const handleDeleteClick = (id) => {
     setSelectedId(id);
     setOpenDeleteDialog(true);
   };
 
   const handleConfirmDelete = async () => {
     setOpenDeleteDialog(false);
     setRows(rows.filter((row) => row._id !== selectedId));
     deleteDataFunction(`/SubLocality/deleteSubLocality/${selectedId}`)
 
   };
   const columns = [  
     { field: 'code', headerName: 'Locality Code', width: 250, },
     { field: 'SubLocalityName', headerName: 'SubLocalityName', width: 450, },
     { field: 'SaleFlowRef', headerName: 'Sales Flow Ref', width: 250, },
 
     
     {
       field: 'actions',
       type: 'actions',
       headerName: 'Actions',
       width: 130,
       getActions: ({ id }) => [
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
 
   return (
 
     <div className="pd-page"><div className="pd-card pd-list-grid p-2 h-[70vh] w-full overflow-x-auto">
      {/* <SublocaliyData /> */}
       <ToastContainer />
       <DataGrid
         rows={rows}
         columns={columns}
         pageSize={5}
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
  )
}

export default SubLocalitylist