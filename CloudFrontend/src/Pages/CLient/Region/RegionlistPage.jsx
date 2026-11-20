import React from 'react'
import RegionList from '../../../Components/Client/Region/RegionList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const RegionlistPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Regions</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/RegionAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <RegionList />
    </div>
  )
}

export default RegionlistPage