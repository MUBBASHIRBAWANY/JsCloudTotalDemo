import React, { useState } from 'react'
import {
  Table, TableHead, TableBody, TableRow, TableCell,
  Button, TextField, CircularProgress, Alert
} from '@mui/material'
import PrintIcon from '@mui/icons-material/Print'
import { getDataFundtion } from '../../../Api/CRUDFunctions'

const IncomeTaxChallanPage = () => {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [challan, setChallan] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleGenerate = async () => {
    setLoading(true); setError(null)
    try {
      const d = await getDataFundtion(`HrIncomeTax/challan?month=${month}&year=${year}`)
      setChallan(d.data || [])
    } catch { setError('Failed to generate challan') }
    finally { setLoading(false) }
  }

  const totalGross = challan.reduce((s, r) => s + (r.grossSalary || 0), 0)
  const totalNet = challan.reduce((s, r) => s + (r.netSalary || 0), 0)
  const totalTax = challan.reduce((s, r) => s + (r.taxDeducted || 0), 0)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Income Tax Challan</h2>
        {challan.length > 0 && (
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={() => window.print()}>Print</Button>
        )}
      </div>

      {error && <Alert severity="error" className="mb-4" onClose={() => setError(null)}>{error}</Alert>}

      <div className="flex gap-4 items-end mb-6">
        <TextField label="Month" type="number" size="small" value={month}
          onChange={e => setMonth(Number(e.target.value))} sx={{ width: 90 }}
          slotProps={{ input: { min: 1, max: 12 } }} />
        <TextField label="Year" type="number" size="small" value={year}
          onChange={e => setYear(Number(e.target.value))} sx={{ width: 100 }} />
        <Button variant="contained" onClick={handleGenerate} disabled={loading}>
          {loading ? <CircularProgress size={20} /> : 'Generate Challan'}
        </Button>
      </div>

      {challan.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Income Tax Challan — {month}/{year} &nbsp;|&nbsp; {challan.length} employees
          </p>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Employee Name</TableCell>
                <TableCell>NTU Number</TableCell>
                <TableCell align="right">Gross Salary</TableCell>
                <TableCell align="right">Net Salary</TableCell>
                <TableCell align="right">Tax Deducted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {challan.map((r, i) => (
                <TableRow key={r.employeeId || i}>
                  <TableCell>{r.code}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.ntuNumber || '—'}</TableCell>
                  <TableCell align="right">{Number(r.grossSalary || 0).toLocaleString()}</TableCell>
                  <TableCell align="right">{Number(r.netSalary || 0).toLocaleString()}</TableCell>
                  <TableCell align="right">{Number(r.taxDeducted || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ backgroundColor: '#f8fafc', fontWeight: 700 }}>
                <TableCell colSpan={3}><strong>Total</strong></TableCell>
                <TableCell align="right"><strong>{totalGross.toLocaleString()}</strong></TableCell>
                <TableCell align="right"><strong>{totalNet.toLocaleString()}</strong></TableCell>
                <TableCell align="right"><strong>{totalTax.toLocaleString()}</strong></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <p className="text-xs text-gray-400 mt-2">
            * Tax deducted is a placeholder. Configure tax slabs in Company Policy for actual values.
          </p>
        </>
      )}
    </div>
  )
}

export default IncomeTaxChallanPage
