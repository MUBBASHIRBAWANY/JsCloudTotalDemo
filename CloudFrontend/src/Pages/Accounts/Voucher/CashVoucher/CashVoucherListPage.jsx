import React from 'react'
import CashVoucherList from '../../../../Components/Accounts/Vouchers/CashVoucher/CashVoucherList'
import AppButton, { PlusIcon } from '../../../../Components/Global/AppButton'

const CashVoucherListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Cash Vouchers</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/CashVoucherAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <CashVoucherList />
    </div>
  )
}

export default CashVoucherListPage