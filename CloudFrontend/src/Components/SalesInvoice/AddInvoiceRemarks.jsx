import React, { useState } from 'react'
import { getDataFundtion, createDataFunction, updateDataFunction } from '../../Api/CRUDFunctions'
import { toast, ToastContainer } from 'react-toastify'
import { CircularProgress } from '@mui/material'

const AddInvoiceRemarks = () => {
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [remarks, setRemarks] = useState('')
  const [invoiceData, setInvoiceData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [RemainingAmount, SetRemainingAmount] = useState(0)

  const handleSearchInvoice = async () => {
    if (!invoiceNumber.trim()) {
      toast.error('Please enter invoice number')
      return
    }
    setSearchLoading(true)
    setInvoiceData(null)
    try {
      const res = await getDataFundtion(`/SaleInvoice/getInvoiceByref/${invoiceNumber.trim()}`)
      console.log(res)

      if (res) {
        SetRemainingAmount(Number(res.TotalAmount)-Number(res.RecivedAmount))
        setInvoiceData(res)
        toast.success('Invoice found')
      } else {
        toast.error('Invoice not found')
      }
    } catch (error) {
      toast.error('Invoice not found or error fetching data')
      setInvoiceData(null)
    } finally {
      setSearchLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearchInvoice()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!invoiceNumber.trim()) {
      toast.error('Please enter invoice number')
      return
    }
    if (!remarks.trim()) {
      toast.error('Please enter remarks')
      return
    }
    setLoading(true)
    try {
      await updateDataFunction(`/SaleInvoice/updateRemarks/${invoiceData._id}`, {
        Remarks: remarks.trim()
      })
      toast.success('Remarks saved successfully')
      setRemarks('')
    } catch (error) {
      toast.error('Failed to save remarks')
    } finally {
      setLoading(false)
    }
  }

  const remainingAmount = invoiceData?.RemainingAmount || 0
  const totalAmount = invoiceData?.TotalAmount || 0

  return (
    <div className="p-4">
      <h1 className="text-xl md:pd-page-title text-center mb-6">Add Invoice Remarks</h1>
<ToastContainer />
      <div className="pd-card p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="pd-label">Invoice Number</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pd-input flex-1"
                placeholder="Enter Invoice Number..."
              />
              <button
                type="button"
                onClick={handleSearchInvoice}
                disabled={searchLoading}
                className="pd-btn-save whitespace-nowrap"
              >
                {searchLoading ? <CircularProgress size={20} color="inherit" /> : 'Search'}
              </button>
            </div>
          </div>
        </div>

        {invoiceData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-3 border rounded-lg" style={{ background: 'var(--pd-surface-container-low)' }}>
            <div>
              <label className="pd-label">Invoice Number</label>
              <p className="text-sm font-medium">{invoiceData.SalesInvoice || '-'}</p>
            </div>
            <div>
              <label className="pd-label">Total Amount</label>
              <p className="text-sm font-medium">{Number(totalAmount).toLocaleString()}</p>
            </div>
            <div>
              <label className="pd-label">Remaining Amount</label>
              <p className="text-sm font-semibold" style={{ color: remainingAmount > 0 ? 'var(--pd-error, #dc2626)' : 'var(--pd-success, #16a34a)' }}>
                {Number(RemainingAmount).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="md:col-span-2">
              <label className="pd-label">Remarks</label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="pd-input"
                placeholder="Enter remarks..."
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="pd-btn-save text-sm md:text-base"
              >
                {loading ? <CircularProgress size={20} color="inherit" /> : 'Save Remarks'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddInvoiceRemarks
