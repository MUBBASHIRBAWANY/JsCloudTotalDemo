import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, Chip, TextField, CircularProgress, Alert
} from '@mui/material'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions'

const CloseMonthPage = () => {
  const now = new Date()
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [closeMonth, setCloseMonth] = useState(now.getMonth() + 1)
  const [closeYear, setCloseYear] = useState(now.getFullYear())
  const [closedBy, setClosedBy] = useState('')

  const loadMonths = async () => {
    setLoading(true)
    try {
      const d = await getDataFundtion('HrPayrollMonth/')
      setMonths(d.data || [])
    } catch { setError('Failed to load months') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadMonths() }, [])

  const handleClose = async () => {
    try {
      await createDataFunction('/HrPayrollMonth/close', { month: Number(closeMonth), year: Number(closeYear), closedBy })
      setSuccess(`Month ${closeMonth}/${closeYear} closed.`)
      loadMonths()
    } catch { setError('Failed to close month') }
  }

  const handleReopen = async (month, year) => {
    try {
      await createDataFunction('/HrPayrollMonth/reopen', { month, year })
      setSuccess(`Month ${month}/${year} reopened.`)
      loadMonths()
    } catch { setError('Failed to reopen month') }
  }

  return (
    <div className="p-6">
      <h2 className="pd-section-title mb-5">Close / Update Salary Month</h2>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Close form */}
      <div className="pd-card p-5 mb-8">
        <h3 className="pd-section-title mb-4">Close a Month</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <TextField label="Month" type="number" size="small" value={closeMonth}
            onChange={e => setCloseMonth(e.target.value)} sx={{ width: 90 }}
            slotProps={{ input: { min: 1, max: 12 } }} />
          <TextField label="Year" type="number" size="small" value={closeYear}
            onChange={e => setCloseYear(e.target.value)} sx={{ width: 100 }} />
          <TextField label="Closed By" size="small" value={closedBy}
            onChange={e => setClosedBy(e.target.value)} sx={{ minWidth: 180 }} />
          <Button variant="contained" color="error" startIcon={<LockIcon />} onClick={handleClose}>
            Close Month
          </Button>
        </div>
      </div>

      {/* Month list */}
      <h3 className="pd-section-title mb-3">Month Status List</h3>
      {loading ? (
        <div className="flex justify-center py-8"><CircularProgress /></div>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month/Year</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Closed At</TableCell>
              <TableCell>Closed By</TableCell>
              <TableCell>Reopened At</TableCell>
              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {months.length === 0 && <TableRow><TableCell colSpan={6} align="center">No month records.</TableCell></TableRow>}
            {months.map(m => (
              <TableRow key={m._id}>
                <TableCell>{m.month}/{m.year}</TableCell>
                <TableCell>
                  <Chip label={m.status} color={m.status === 'closed' ? 'error' : 'success'} size="small" />
                </TableCell>
                <TableCell>{m.closedAt ? new Date(m.closedAt).toLocaleString() : '—'}</TableCell>
                <TableCell>{m.closedBy || '—'}</TableCell>
                <TableCell>{m.reopenedAt ? new Date(m.reopenedAt).toLocaleString() : '—'}</TableCell>
                <TableCell align="center">
                  {m.status === 'closed' && (
                    <Button size="small" variant="outlined" startIcon={<LockOpenIcon />} onClick={() => handleReopen(m.month, m.year)}>
                      Reopen
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default CloseMonthPage
