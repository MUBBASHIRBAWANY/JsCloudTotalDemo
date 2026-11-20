import React from 'react'
import Zonelist from '../../../Components/Client/Zone/Zonelist'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ZonelistPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Zones</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ZoneAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ZoneAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <Zonelist />
    </div>
  )
}

export default ZonelistPage