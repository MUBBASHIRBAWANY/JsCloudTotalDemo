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

const ReligionList = () => {
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getDataFundtion('HrReligion/').then(d => setRows(d.data || []))
  }, [])

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false)
    await deleteDataFunction(`/HrReligion/delete/${selectedId}`)
    setRows(rows.filter(r => r._id !== selectedId))
    toast.success('Deleted')
  }

  const columns = [
    { field: 'code', headerName: 'Code', width: 120 },
    { field: 'name', headerName: 'Name', flex: 1 },
    {
      field: 'actions', type: 'actions', width: 120,
      getActions: p => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => navigate(`/HrReligionEdit/${p.row._id}`)} />,
        <GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={() => { setSelectedId(p.row._id); setOpenDeleteDialog(true) }} />,
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
        <DialogTitle>Delete Religion?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default ReligionList
