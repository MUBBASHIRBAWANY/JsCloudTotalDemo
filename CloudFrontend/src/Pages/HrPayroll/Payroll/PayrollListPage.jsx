import React from 'react'
import PayrollList from '../../../Components/HrPayroll/Payroll/PayrollList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const PayrollListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Payroll</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/PayrollGenerate" icon={<PlusIcon />}>
            Generate Payroll
          </AppButton>
        </div>
      </div>
      <PayrollList />
    </div>
  )
}

export default PayrollListPage
