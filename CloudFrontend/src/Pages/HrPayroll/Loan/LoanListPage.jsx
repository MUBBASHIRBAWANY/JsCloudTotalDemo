import React from 'react'
import LoanList from '../../../Components/HrPayroll/Loan/LoanList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const LoanListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Loans</h2>
        <AppButton to="/LoanAdd" icon={<PlusIcon />}>Add</AppButton>
      </div>
      <LoanList />
    </div>
  )
}

export default LoanListPage
