import React, { useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, Chip, Checkbox, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, Card, CardContent, Typography
} from '@mui/material'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions'

const statusColor = (s) => ({ paid: 'success', approved: 'info', processed: 'warning', draft: 'default', rejected: 'error' }[s] || 'default')

const SalaryPaidPage = () => {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [payrolls, setPayrolls] = useState([])
  const [monthStatus, setMonthStatus] = useState(null)
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [payMethod, setPayMethod] = useState('bank_transfer')
  const [payRef, setPayRef] = useState('')
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  const handleLoad = async () => {
    setLoading(true); setError(null); setSelected([])
    try {
      const [payRes, statusRes] = await Promise.all([
        getDataFundtion(`Payroll/?month=${month}&year=${year}`),
        getDataFundtion(`Payroll/monthStatus?month=${month}&year=${year}`)
      ])
      setPayrolls(payRes.data || [])
      setMonthStatus(statusRes.data || null)
    } catch { setError('Failed to load payrolls') }
    finally { setLoading(false) }
  }

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const toggleAll = () => setSelected(selected.length === payrolls.length ? [] : payrolls.map(p => p._id))

  const handleMarkPaid = async () => {
    try {
      await createDataFunction('/Payroll/markPaid', { payrollIds: selected, paymentMethod: payMethod, paymentReference: payRef })
      setSuccess(`${selected.length} payroll(s) marked as paid.`)
      setPayDialogOpen(false)
      setSelected([])
      handleLoad()
    } catch { setError('Failed to mark as paid') }
  }

  const empName = (p) => {
    const e = p.employeeId
    if (typeof e === 'object') return `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.code
    return e
  }

  return (
    <div className="p-6">
      <h2 className="pd-section-title mb-5">Salary Paid Process</h2>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Filter */}
      <div className="flex gap-4 items-end mb-6">
        <TextField label="Month" type="number" size="small" value={month} onChange={e => setMonth(Number(e.target.value))} sx={{ width: 90 }} slotProps={{ input: { min: 1, max: 12 } }} />
        <TextField label="Year" type="number" size="small" value={year} onChange={e => setYear(Number(e.target.value))} sx={{ width: 100 }} />
        <Button variant="outlined" onClick={handleLoad} disabled={loading}>Load</Button>
        {selected.length > 0 && (
          <Button variant="contained" color="success" onClick={() => setPayDialogOpen(true)}>
            Mark {selected.length} as Paid
          </Button>
        )}
      </div>

      {/* Month Status Card */}
      {monthStatus && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          {[['Total', monthStatus.total], ['Draft', monthStatus.draft], ['Processed', monthStatus.processed], ['Approved', monthStatus.approved], ['Paid', monthStatus.paid]].map(([label, val]) => (
            <Card key={label} variant="outlined">
              <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
                <Typography variant="h5" fontWeight={700}>{val ?? 0}</Typography>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && <div className="flex justify-center py-8"><CircularProgress /></div>}

      {!loading && payrolls.length > 0 && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox checked={selected.length === payrolls.length} indeterminate={selected.length > 0 && selected.length < payrolls.length} onChange={toggleAll} size="small" />
              </TableCell>
              <TableCell>Employee</TableCell>
              <TableCell align="right">Gross</TableCell>
              <TableCell align="right">Net</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Pay Method</TableCell>
              <TableCell>Paid At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payrolls.map(p => (
              <TableRow key={p._id} selected={selected.includes(p._id)}>
                <TableCell padding="checkbox">
                  <Checkbox checked={selected.includes(p._id)} onChange={() => toggleSelect(p._id)} size="small" disabled={p.status === 'paid'} />
                </TableCell>
                <TableCell>{empName(p)}</TableCell>
                <TableCell align="right">{Number(p.grossSalary || 0).toLocaleString()}</TableCell>
                <TableCell align="right">{Number(p.netSalary || 0).toLocaleString()}</TableCell>
                <TableCell><Chip label={p.status} color={statusColor(p.status)} size="small" /></TableCell>
                <TableCell>{p.paymentMethod || '—'}</TableCell>
                <TableCell>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && payrolls.length === 0 && <p className="text-sm text-gray-500 mt-4">No payroll records. Load a month first.</p>}

      {/* Mark Paid Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Mark {selected.length} Payroll(s) as Paid</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            <FormControl size="small" fullWidth>
              <InputLabel>Payment Method</InputLabel>
              <Select value={payMethod} label="Payment Method" onChange={e => setPayMethod(e.target.value)}>
                <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                <MenuItem value="cash">Cash</MenuItem>
                <MenuItem value="cheque">Cheque</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Payment Reference" size="small" value={payRef} onChange={e => setPayRef(e.target.value)} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="success" onClick={handleMarkPaid}>Confirm</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default SalaryPaidPage
