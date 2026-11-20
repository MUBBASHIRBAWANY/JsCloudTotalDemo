import React from 'react'
import VendorList from '../../Components/Product/Vendor/VendorList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'

const VendorListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Vendors</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/VendorAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/VendorBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <VendorList />
    </div>
  )
}

export default VendorListPage