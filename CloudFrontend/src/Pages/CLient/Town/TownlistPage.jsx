import React from 'react'
import TownList from '../../../Components/Client/Town/TownList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const TownlistPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Towns</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/TownAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/TownAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <TownList />
    </div>
  )
}

export default TownlistPage