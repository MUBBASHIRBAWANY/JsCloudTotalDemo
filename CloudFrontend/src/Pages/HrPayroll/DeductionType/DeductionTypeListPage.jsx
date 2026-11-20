import React from 'react'
import DeductionTypeList from '../../../Components/HrPayroll/DeductionType/DeductionTypeList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const DeductionTypeListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Deduction Types</h2>
        <AppButton to="/DeductionTypeAdd" icon={<PlusIcon />}>Add</AppButton>
      </div>
      <DeductionTypeList />
    </div>
  )
}

export default DeductionTypeListPage
