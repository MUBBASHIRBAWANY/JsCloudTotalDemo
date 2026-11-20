import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, TextField, Select, MenuItem, FormControl, InputLabel,
  CircularProgress, Alert
} from '@mui/material'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions'

const TransferEmployeePage = () => {
  const [employees, setEmployees] = useState([])
  const [departments, setDepartments] = useState([])
  const [history, setHistory] = useState([])
  const [histEmpId, setHistEmpId] = useState('')
  const [loading, setLoading] = useState(false)
  const [histLoading, setHistLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)
  const [form, setForm] = useState({ employeeId: '', toDepartmentId: '', transferDate: '', reason: '', transferredBy: '' })

  useEffect(() => {
    getDataFundtion('HrEmployee/getEmployeeNameId').then(d => setEmployees(d.data || []))
    getDataFundtion('HrDepartment/getDepartmentNameId').then(d => setDepartments(d.data || []))
  }, [])

  const handleTransfer = async () => {
    if (!form.employeeId || !form.toDepartmentId || !form.transferDate) {
      setError('Employee, destination department, and transfer date are required.'); return
    }
    setLoading(true); setError(null)
    try {
      await createDataFunction('/HrTransfer/transfer', form)
      setSuccess('Employee transferred successfully.')
      setForm({ employeeId: '', toDepartmentId: '', transferDate: '', reason: '', transferredBy: '' })
    } catch { setError('Transfer failed.') }
    finally { setLoading(false) }
  }

  const handleLoadHistory = async () => {
    if (!histEmpId) return
    setHistLoading(true)
    try {
      const d = await getDataFundtion(`HrTransfer/history/${histEmpId}`)
      setHistory(d.data || [])
    } catch { setError('Failed to load history') }
    finally { setHistLoading(false) }
  }

  const deptName = (id) => departments.find(d => d._id === id)?.name || id

  return (
    <div className="p-6">
      <h2 className="pd-section-title mb-5">Transfer Employee</h2>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert severity="success" className="mb-4" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Transfer Form */}
      <div className="pd-card p-5 mb-8">
        <h3 className="pd-section-title mb-4">Initiate Transfer</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormControl size="small" fullWidth>
            <InputLabel>Employee *</InputLabel>
            <Select value={form.employeeId} label="Employee *" onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))}>
              {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.firstName} {e.lastName || ''} ({e.code})</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" fullWidth>
            <InputLabel>To Department *</InputLabel>
            <Select value={form.toDepartmentId} label="To Department *" onChange={e => setForm(p => ({ ...p, toDepartmentId: e.target.value }))}>
              {departments.map(d => <MenuItem key={d._id} value={d._id}>{d.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="Transfer Date *" type="date" size="small" value={form.transferDate}
            onChange={e => setForm(p => ({ ...p, transferDate: e.target.value }))}
            slotProps={{ inputLabel: { shrink: true } }} />
          <TextField label="Reason" size="small" value={form.reason}
            onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
          <TextField label="Transferred By" size="small" value={form.transferredBy}
            onChange={e => setForm(p => ({ ...p, transferredBy: e.target.value }))} />
        </div>
        <Button variant="contained" className="mt-4" onClick={handleTransfer} disabled={loading} sx={{ mt: 2 }}>
          {loading ? <CircularProgress size={20} /> : 'Transfer'}
        </Button>
      </div>

      {/* Transfer History */}
      <div className="pd-card p-5">
        <h3 className="pd-section-title mb-4">Transfer History</h3>
        <div className="flex gap-4 items-end mb-4">
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Employee</InputLabel>
            <Select value={histEmpId} label="Employee" onChange={e => setHistEmpId(e.target.value)}>
              {employees.map(e => <MenuItem key={e._id} value={e._id}>{e.firstName} {e.lastName || ''} ({e.code})</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="outlined" onClick={handleLoadHistory} disabled={histLoading || !histEmpId}>Load History</Button>
        </div>

        {histLoading && <div className="flex justify-center py-4"><CircularProgress /></div>}

        {!histLoading && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>From Department</TableCell>
                <TableCell>To Department</TableCell>
                <TableCell>Transfer Date</TableCell>
                <TableCell>Reason</TableCell>
                <TableCell>Transferred By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.length === 0
                ? <TableRow><TableCell colSpan={5} align="center">No history found.</TableCell></TableRow>
                : history.map(h => (
                    <TableRow key={h._id}>
                      <TableCell>{h.fromDepartmentId?.name || deptName(h.fromDepartmentId)}</TableCell>
                      <TableCell>{h.toDepartmentId?.name || deptName(h.toDepartmentId)}</TableCell>
                      <TableCell>{h.transferDate ? new Date(h.transferDate).toLocaleDateString() : '—'}</TableCell>
                      <TableCell>{h.reason || '—'}</TableCell>
                      <TableCell>{h.transferredBy || '—'}</TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

export default TransferEmployeePage
