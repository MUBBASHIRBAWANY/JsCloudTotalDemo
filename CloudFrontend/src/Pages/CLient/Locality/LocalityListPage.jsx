import React from 'react'
import LocalityList from '../../../Components/Client/Locality/LocalityList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const LocalityListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Localities</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/LocalityAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/LocalityBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <LocalityList />
    </div>
  )
}

export default LocalityListPage