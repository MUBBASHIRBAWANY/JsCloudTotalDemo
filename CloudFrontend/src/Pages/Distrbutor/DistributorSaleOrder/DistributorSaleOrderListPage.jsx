import React from 'react'

import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import DistributorSaleOrderList from '../../../Components/Distrbutor/SaleOrder/DistributorSaleOrderList'

const DistributorSaleOrderListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Distribution Sale Orders</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/DistributorSaleOrderAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <DistributorSaleOrderList />
    </div>
  )
}

export default DistributorSaleOrderListPage