import React from 'react'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import ZsmList from '../../../Components/Distrbutor/Zsm/ZsmList'

const ZsmListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">ZSM</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ZsmAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <ZsmList />
    </div>
  )
}

export default ZsmListPage
