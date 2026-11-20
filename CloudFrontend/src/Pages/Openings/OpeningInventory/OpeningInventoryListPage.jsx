import React from 'react'
import OpeningInventoryList from '../../../Components/OpeningInventory/OpeningInventoryList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const OPeningInventorListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Opening Inventory</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/OpeningInventoryAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/OpeninginventoryBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <OpeningInventoryList />
    </div>
  )
}

export default OPeningInventorListPage