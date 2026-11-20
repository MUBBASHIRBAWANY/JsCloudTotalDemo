import React from 'react'
import CustomerChqList from '../../../Components/Accounts/CustomerChq/CustomerChqList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const CustomerChqListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Customer Cheques</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/CustomerChqAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          
          <AppButton to="/CustomerChqBulkAdd">
            Bulk Add
          </AppButton>
        </div>
      </div>
      <CustomerChqList />
    </div>
  )
}

export default CustomerChqListPage