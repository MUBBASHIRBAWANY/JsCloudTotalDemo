import React from 'react'
import BankList from '../../../Components/HrPayroll/Bank/BankList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const BankListPage = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-5">
      <h2 className="pd-section-title">Banks</h2>
      <AppButton to="/HrBankAdd" icon={<PlusIcon />}>Add</AppButton>
    </div>
    <BankList />
  </div>
)

export default BankListPage
