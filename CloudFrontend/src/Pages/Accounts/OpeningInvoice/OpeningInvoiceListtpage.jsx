import React from 'react'
import OpeningInvoiceList from '../../../Components/Accounts/OpeningBalance/OpeningInvoice/OpeningInvoiceList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const OpeningInvoiceListtpage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Opening Invoices</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/InvoiceOpening" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/InvoiceOpeningBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <OpeningInvoiceList />
    </div>
  )
}

export default OpeningInvoiceListtpage