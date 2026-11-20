import React from 'react'
import OrderBookerTarget from '../../../Components/Distrbutor/OrderBookerTarget/OrderBookerTarget'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
const OrderBookerTargetListPage = () => {
  return (
     <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Order Booker Target</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/OrderBookerTargetAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/OrderBookerTargetBulkAdd" icon={<PlusIcon />}>
            Bulk Add
          </AppButton>
        </div>
      </div>
      <OrderBookerTarget />
    </div>
  )
}

export default OrderBookerTargetListPage