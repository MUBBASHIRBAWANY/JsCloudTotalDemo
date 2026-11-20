import React from 'react'
import OderBookerList from '../../../Components/OderBooker/OderBookerList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const OrderBookerListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Order Bookers</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/OrderBookerAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/OrderBookerBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <OderBookerList />
    </div>
  )
}

export default OrderBookerListPage