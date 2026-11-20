import React, { useEffect, useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, Chip, IconButton, TextField, Select, MenuItem,
  FormControl, InputLabel, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress, Typography
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import SaveIcon from '@mui/icons-material/Save'
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions'

const emptyLine = { code: '', description: '', type: 'earning', amount: 0, linkAccount: '' }

const SalaryLinesEditor = ({ employeeId }) => {
  const [lines, setLines] = useState([])
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newLine, setNewLine] = useState({ ...emptyLine })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [empRes, codeRes] = await Promise.all([
          getDataFundtion(`/HrEmployee/${employeeId}`),
          getDataFundtion('HrEarningDeductionCode/active')
        ])
        setLines(empRes?.data?.salaryLines || [])
        setCodes(codeRes?.data || [])
      } catch { setMsg({ type: 'error', text: 'Failed to load data' }) }
      finally { setLoading(false) }
    }
    if (employeeId) load()
  }, [employeeId])

  const handleAmountChange = (idx, val) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, amount: Number(val) || 0 } : l))
  }

  const handleRemove = (idx) => {
    setLines(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCodeSelect = (code) => {
    const found = codes.find(c => c.code === code)
    if (found) {
      setNewLine({ code: found.code, description: found.description, type: found.type, amount: found.defaultAmount || 0, linkAccount: found.linkAccount || '' })
    } else {
      setNewLine(prev => ({ ...prev, code }))
    }
  }

  const handleAddLine = () => {
    if (!newLine.description) return
    setLines(prev => [...prev, { ...newLine }])
    setNewLine({ ...emptyLine })
    setAddDialogOpen(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      await updateDataFunction(`/HrEmployee/salaryLines/${employeeId}`, { salaryLines: lines })
      setMsg({ type: 'success', text: 'Salary lines saved successfully.' })
    } catch { setMsg({ type: 'error', text: 'Failed to save salary lines.' }) }
    finally { setSaving(false) }
  }

  const earningsTotal = lines.filter(l => l.type === 'earning').reduce((s, l) => s + (l.amount || 0), 0)
  const deductionsTotal = lines.filter(l => l.type === 'deduction').reduce((s, l) => s + (l.amount || 0), 0)
  const netPayable = earningsTotal - deductionsTotal

  if (loading) return <div className="flex justify-center py-6"><CircularProgress /></div>

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="pd-section-title">Salary Setup (Earning / Deduction Grid)</h3>
        <div className="flex gap-2">
          <Button variant="outlined" size="small" startIcon={<AddIcon />} onClick={() => setAddDialogOpen(true)}>
            Add Line
          </Button>
          <Button variant="contained" size="small" startIcon={<SaveIcon />} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Lines'}
          </Button>
        </div>
      </div>

      {msg && <Alert severity={msg.type} className="mb-3" onClose={() => setMsg(null)}>{msg.text}</Alert>}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Code</TableCell>
            <TableCell>Description</TableCell>
            <TableCell>Type</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Link Account</TableCell>
            <TableCell align="center">Remove</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ color: 'text.secondary' }}>
                No salary lines. Click "Add Line" to begin.
              </TableCell>
            </TableRow>
          )}
          {lines.map((line, idx) => (
            <TableRow key={idx}>
              <TableCell>{line.code}</TableCell>
              <TableCell>{line.description}</TableCell>
              <TableCell>
                <Chip label={line.type} color={line.type === 'earning' ? 'success' : 'error'} size="small" />
              </TableCell>
              <TableCell align="right">
                <input
                  type="number"
                  value={line.amount}
                  onChange={e => handleAmountChange(idx, e.target.value)}
                  className="pd-input text-right"
                  style={{ width: 120 }}
                />
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{line.linkAccount}</TableCell>
              <TableCell align="center">
                <IconButton size="small" color="error" onClick={() => handleRemove(idx)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
          {/* Footer totals */}
          {lines.length > 0 && (
            <>
              <TableRow sx={{ backgroundColor: '#f0fdf4' }}>
                <TableCell colSpan={3} align="right"><strong>Total Earnings</strong></TableCell>
                <TableCell align="right"><strong>{earningsTotal.toLocaleString()}</strong></TableCell>
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow sx={{ backgroundColor: '#fff1f2' }}>
                <TableCell colSpan={3} align="right"><strong>Total Deductions</strong></TableCell>
                <TableCell align="right"><strong>{deductionsTotal.toLocaleString()}</strong></TableCell>
                <TableCell colSpan={2} />
              </TableRow>
              <TableRow sx={{ backgroundColor: '#f0f9ff' }}>
                <TableCell colSpan={3} align="right"><strong>Net Payable</strong></TableCell>
                <TableCell align="right">
                  <Typography fontWeight={700} color={netPayable >= 0 ? 'success.main' : 'error.main'}>
                    {netPayable.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell colSpan={2} />
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>

      {/* Add Line Dialog */}
      <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Salary Line</DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            <FormControl size="small" fullWidth>
              <InputLabel>Select Code</InputLabel>
              <Select
                value={newLine.code}
                label="Select Code"
                onChange={e => handleCodeSelect(e.target.value)}
              >
                <MenuItem value=""><em>Manual Entry</em></MenuItem>
                {codes.map(c => (
                  <MenuItem key={c._id} value={c.code}>
                    {c.code} — {c.description} ({c.type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="Code" size="small" value={newLine.code}
              onChange={e => setNewLine(p => ({ ...p, code: e.target.value }))} />
            <TextField label="Description *" size="small" value={newLine.description}
              onChange={e => setNewLine(p => ({ ...p, description: e.target.value }))} />
            <FormControl size="small" fullWidth>
              <InputLabel>Type</InputLabel>
              <Select value={newLine.type} label="Type"
                onChange={e => setNewLine(p => ({ ...p, type: e.target.value }))}>
                <MenuItem value="earning">Earning</MenuItem>
                <MenuItem value="deduction">Deduction</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Amount" type="number" size="small" value={newLine.amount}
              onChange={e => setNewLine(p => ({ ...p, amount: Number(e.target.value) || 0 }))} />
            <TextField label="Link Account (GL)" size="small" value={newLine.linkAccount}
              onChange={e => setNewLine(p => ({ ...p, linkAccount: e.target.value }))} />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddLine} disabled={!newLine.description}>Add</Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default SalaryLinesEditor
