import React from 'react'
import AllowanceTypeList from '../../../Components/HrPayroll/AllowanceType/AllowanceTypeList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const AllowanceTypeListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Allowance Types</h2>
        <AppButton to="/AllowanceTypeAdd" icon={<PlusIcon />}>Add</AppButton>
      </div>
      <AllowanceTypeList />
    </div>
  )
}

export default AllowanceTypeListPage
