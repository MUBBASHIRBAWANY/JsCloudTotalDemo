import React from 'react'
import Transportlist from '../../../Components/DistributorSetup/Transporter/TransporterList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const TransporterListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Transporters</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/TransportAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <Transportlist />
    </div>
  )
}

export default TransporterListPage