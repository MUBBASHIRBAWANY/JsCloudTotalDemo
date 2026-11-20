import React from 'react'

import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import DitributorRcList from '../../../Components/Distrbutor/DitributorRc/DitributorRcList'

const DitributorRcListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Distributor RC</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/DitributorRcAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <DitributorRcList />
    </div>
  )
}

export default DitributorRcListPage