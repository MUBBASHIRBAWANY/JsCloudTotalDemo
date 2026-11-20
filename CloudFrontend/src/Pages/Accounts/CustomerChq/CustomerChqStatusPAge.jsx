import React from 'react'
import CustomerChqStatus from '../../../Components/Accounts/CustomerChq/CustomerChqStatus'

const CustomerChqStatusPAge = () => {
  return (
    <div className="p-5 md:p-6 bg-slate-50 min-h-screen">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="text-2xl">🔄</div>
              <h2 className="text-[22px] font-semibold pd-text-body tracking-tight">Customer Cheque Status</h2>
            </div>
            <p className="text-sm pd-text-muted pl-1 mt-0.5">
              Search by cheque number to view &amp; update status (Bounce / Return to customer)
            </p>
          </div>
        </div>

        <CustomerChqStatus />
      </div>
    </div>
  )
}

export default CustomerChqStatusPAge