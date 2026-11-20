import React from 'react'
import SubLocalitylist from '../../../Components/Client/SubLocality/SubLocalitylist'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const SubLocalityListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Sub Localities</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/SubLocalityAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/SubLocalityAddBulk" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <SubLocalitylist />
    </div>
  )
}

export default SubLocalityListPage