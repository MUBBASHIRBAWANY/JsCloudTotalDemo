import React from 'react'
import TransferInList from '../../Components/TransferIn/TransferInList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'

const TransferInListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Transfer In</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/TransferInBuklAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <TransferInList />
    </div>
  )
}

export default TransferInListPage