import React, { useEffect, useState } from 'react'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import { useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions'

const ContractorList = () => {
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const navigate = useNavigate()

  const getData = async () => {
    const data = await getDataFundtion('HrContractor/')
    setRows(data.data || [])
  }

  useEffect(() => { getData() }, [])

  const handleDeleteClick = (id) => { setSelectedId(id); setOpenDeleteDialog(true) }

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false)
    await deleteDataFunction(`/HrContractor/delete/${selectedId}`)
    setRows(rows.filter(r => r._id !== selectedId))
    toast.success('Contractor deleted')
  }

  const columns = [
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 200 },
    { field: 'contactInfo', headerName: 'Contact Info', flex: 1, minWidth: 200 },
    { field: 'active', headerName: 'Active', width: 90, renderCell: p => p.value ? 'Yes' : 'No' },
    {
      field: 'actions', type: 'actions', headerName: 'Actions', width: 120,
      getActions: (p) => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => navigate(`/HrContractorEdit/${p.row._id}`)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => handleDeleteClick(p.row._id)} />,
      ],
    },
  ]

  return (
    <div>
      <ToastContainer />
      <div style={{ height: 500, width: '100%' }}>
        <DataGrid rows={rows} columns={columns} getRowId={r => r._id} pageSize={25} rowsPerPageOptions={[25, 50, 100]} disableRowSelectionOnClick />
      </div>
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Contractor?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ContractorList
