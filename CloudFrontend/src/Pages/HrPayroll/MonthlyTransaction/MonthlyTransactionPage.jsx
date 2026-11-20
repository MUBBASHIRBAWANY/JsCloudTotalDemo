import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert, IconButton
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import { getDataFundtion, createDataFunction, deleteDataFunction } from '../../../Api/CRUDFunctions'

const emptyForm = { employeeId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear(), type: 'earning', code: '', description: '', amount: '', note: '' }

const MonthlyTransactionPage = () => {
  const [transactions, setTransactions] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [filter, setFilter] = useState({ empId: '', month: new Date().getMonth() + 1, year: new Date().getFullYear() })

  useEffect(() => {
    getDataFundtion('HrEmployee/getEmployeeNameId').then(d => setEmployees(d.data || []))
  }, [])

  const handleLoad = async () => {
    setLoading(true); setError(null)
    try {
      const url = filter.empId
        ? `HrMonthlyTransaction/employee/${filter.empId}?month=${filter.month}&year=${filter.year}`
        : `HrMonthlyTransaction/?month=${filter.month}&year=${filter.year}`
      const d = await getDataFundtion(url)
      setTransactions(d.data || [])
    } catch { setError('Failed to load transactions') }
    finally { setLoading(false) }
  }

  const handleAdd = async () => {
    try {
      const d = await createDataFunction('/HrMonthlyTransaction', { ...form, month: Number(form.month), year: Number(form.year), amount: Number(form.amount) })
      setTransactions(prev => [...prev, d.data])
      setSuccess('Transaction added')
      setDialogOpen(false)
      setForm({ ...emptyForm })
    } catch { setError('Failed to add transaction') }
  }

  const handleDelete = async (id) => {
    await deleteDataFunction(`/HrMonthlyTransaction/delete/${id}`)
    setTransactions(prev => prev.filter(t => t._id !== id))
    setSuccess('Deleted')
  }

  const empName = (id) => {
    const e = employees.find(x => x._id === id)
    return e ? `${e.firstName} ${e.lastName || ''}`.trim() : id
  }

  return (
    <div className="p-6">
      <h2 className="pd-section-title mb-5">Monthly Transaction File</h2>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-4 items-end mb-6">
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Employee (optional)</InputLabel>
          <Select value={filter.empId} label="Employee (optional)" onChange={e => setFilter(p => ({ ...p, empId: e.target.value }))}>
            <MenuItem value=""><em>All Employees</em></MenuItem>
            {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.code})</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Month" type="number" size="small" value={filter.month} onChange={e => setFilter(p => ({ ...p, month: e.target.value }))} sx={{ width: 90 }} slotProps={{ input: { min: 1, max: 12 } }} />
        <TextField label="Year" type="number" size="small" value={filter.year} onChange={e => setFilter(p => ({ ...p, year: e.target.value }))} sx={{ width: 100 }} />
        <Button variant="outlined" onClick={handleLoad} disabled={loading}>Load</Button>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Add Transaction</Button>
      </div>

      {loading && <div className="flex justify-center py-8"><CircularProgress /></div>}

      {!loading && (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Employee</TableCell>
              <TableCell>Month/Year</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="center">Del</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {transactions.length === 0 && <TableRow><TableCell colSpan={8} align="center">No transactions. Use filters and click Load.</TableCell></TableRow>}
            {transactions.map(t => (
              <TableRow key={t._id}>
                <TableCell>{empName(t.employeeId)}</TableCell>
                <TableCell>{t.month}/{t.year}</TableCell>
                <TableCell><Chip label={t.type} color={t.type === 'earning' ? 'success' : 'error'} size="small" /></TableCell>
                <TableCell>{t.code}</TableCell>
                <TableCell>{t.description}</TableCell>
                <TableCell align="right">{Number(t.amount).toLocaleString()}</TableCell>
                <TableCell>{t.note}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => handleDelete(t._id)}><DeleteIcon fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Monthly Transaction</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            <FormControl size="small" fullWidth>
              <InputLabel>Employee *</InputLabel>
              <Select value={form.employeeId} label="Employee *" onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
                {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.code})</MenuItem>)}
              </Select>
            </FormControl>
            <div className="grid grid-cols-2 gap-3">
              <TextField label="Month" type="number" size="small" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} slotProps={{ input: { min: 1, max: 12 } }} />
              <TextField label="Year" type="number" size="small" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
            </div>
            <FormControl size="small" fullWidth>
              <InputLabel>Type *</InputLabel>
              <Select value={form.type} label="Type *" onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <MenuItem value="earning">Earning</MenuItem>
                <MenuItem value="deduction">Deduction</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Code" size="small" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
            <TextField label="Description *" size="small" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            <TextField label="Amount *" type="number" size="small" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} />
            <TextField label="Note" size="small" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd} disabled={!form.employeeId || !form.description || !form.amount}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default MonthlyTransactionPage
