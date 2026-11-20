import React from 'react'
import EarningDeductionCodeList from '../../../Components/HrPayroll/EarningDeductionCode/EarningDeductionCodeList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const EarningDeductionListPage = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-5">
      <h2 className="pd-section-title">Earning / Deduction Codes</h2>
      <AppButton to="/HrEarningDeductionAdd" icon={<PlusIcon />}>Add</AppButton>
    </div>
    <EarningDeductionCodeList />
  </div>
)

export default EarningDeductionListPage
