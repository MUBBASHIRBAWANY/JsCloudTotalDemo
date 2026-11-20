import React, { useEffect, useState } from 'react'
import { DataGrid, GridActionsCellItem } from '@mui/x-data-grid'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogTitle from '@mui/material/DialogTitle'
import { Chip } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import { deleteDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions'

const EarningDeductionCodeList = () => {
  const [rows, setRows] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    getDataFundtion('HrEarningDeductionCode/').then(d => setRows(d.data || []))
  }, [])

  const handleConfirmDelete = async () => {
    setOpenDeleteDialog(false)
    await deleteDataFunction(`/HrEarningDeductionCode/delete/${selectedId}`)
    setRows(rows.filter(r => r._id !== selectedId))
    toast.success('Deleted')
  }

  const columns = [
    { field: 'code', headerName: 'Code', width: 100 },
    { field: 'description', headerName: 'Description', flex: 1 },
    {
      field: 'type', headerName: 'Type', width: 130,
      renderCell: p => <Chip label={p.value} color={p.value === 'earning' ? 'success' : 'error'} size="small" />
    },
    { field: 'defaultAmount', headerName: 'Default Amount', width: 150, renderCell: p => Number(p.value || 0).toLocaleString() },
    { field: 'linkAccount', headerName: 'Link Account', flex: 1 },
    { field: 'active', headerName: 'Active', width: 80, renderCell: p => p.value ? 'Yes' : 'No' },
    {
      field: 'actions', type: 'actions', width: 120,
      getActions: p => [
        <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={() => navigate(`/HrEarningDeductionEdit/${p.row._id}`)} />,
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
        <DialogTitle>Delete Earning/Deduction Code?</DialogTitle>
        <DialogActions>
          <button className="pd-btn-outline" onClick={() => setOpenDeleteDialog(false)}>Cancel</button>
          <button className="pd-btn-save" onClick={handleConfirmDelete}>Delete</button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default EarningDeductionCodeList
