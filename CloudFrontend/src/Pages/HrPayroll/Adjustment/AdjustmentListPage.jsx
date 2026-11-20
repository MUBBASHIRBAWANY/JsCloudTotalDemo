import React from 'react'
import AdjustmentList from '../../../Components/HrPayroll/Adjustment/AdjustmentList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const AdjustmentListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Payroll Adjustments</h2>
        <AppButton to="/AdjustmentAdd" icon={<PlusIcon />}>Add</AppButton>
      </div>
      <AdjustmentList />
    </div>
  )
}

export default AdjustmentListPage
