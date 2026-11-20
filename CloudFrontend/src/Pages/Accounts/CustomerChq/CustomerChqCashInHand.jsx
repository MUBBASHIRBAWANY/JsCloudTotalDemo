import React from 'react'
import CustomerChqCashInHand from '../../../Components/Accounts/CustomerChq/CustomerChqCashInHand'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const CustomerChqCashInHandPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        {/* <h2 className="pd-section-title">Customer Cheques</h2> */}
        {/* <div className="flex items-center gap-3">
          <AppButton to="/CustomerChqAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/CustomerChqStatus">
            Change Status
          </AppButton>
         
          <AppButton to="/CustomerChqCashInHand">
            Cash In Hand
          </AppButton>
        </div> */}
      </div>
      <CustomerChqCashInHand />
    </div>
  )
}

export default CustomerChqCashInHandPage