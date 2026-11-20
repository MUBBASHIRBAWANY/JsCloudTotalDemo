import React from 'react'

import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import DistributorOrderBookerList from '../../../Components/Distrbutor/DistributorOrderBooker/DistributorOrderBookerList'

const DistributorOrderBookerListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Order Bookers</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/DistributorOrderBookerAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/OrderBookerBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <DistributorOrderBookerList />
    </div>
  )
}

export default DistributorOrderBookerListPage