import React from 'react'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import DistrbutorList from '../../../Components/Distrbutor/Distributor/DistrbutorList'

const DistrbutorListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Distributors</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/DistrbutorAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/DistributorBulKadd" icon={<PlusIcon />}>
            Bulk Add
          </AppButton>
          <AppButton to="/DistributorBulkUpdate" icon={<PlusIcon />}>
            Update in Bulk
          </AppButton>
        </div>
      </div>
      <DistrbutorList />
    </div>
  )
}

export default DistrbutorListPage