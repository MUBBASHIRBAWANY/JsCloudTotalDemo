import React, { useState } from 'react'
import JournalVoucherList from '../../../../Components/Accounts/Vouchers/JournalVoucher/JournalVoucher'
import SalaryJvUpload from '../../../../Components/Accounts/Vouchers/JournalVoucher/SalaryJvUpload'
import AppButton, { PlusIcon } from '../../../../Components/Global/AppButton'

const JournalVoucherListPage = () => {
  const [listKey, setListKey] = useState(0)
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5 gap-4">
        <h2 className="pd-section-title">Journal Vouchers</h2>
        <div className="flex items-start gap-3">
          <SalaryJvUpload onCreated={() => setListKey((key) => key + 1)} />
          <AppButton to="/JournalVoucherAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <JournalVoucherList key={listKey} />
    </div>
  )
}

export default JournalVoucherListPage