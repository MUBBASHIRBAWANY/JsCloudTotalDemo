import React from 'react'
import DepartmentList from '../../../Components/HrPayroll/Department/DepartmentList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const DepartmentListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Departments</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/DepartmentAdd" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <DepartmentList />
    </div>
  )
}

export default DepartmentListPage
