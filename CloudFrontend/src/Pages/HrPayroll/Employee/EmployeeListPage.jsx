import React from 'react'
import EmployeeList from '../../../Components/HrPayroll/Employee/EmployeeList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const EmployeeListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Employees</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/EmployeeHrAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/EmployeeHrBulkAdd" icon={<PlusIcon />}>
            Bulk Add
          </AppButton>
        </div>
      </div>
      <EmployeeList />
    </div>
  )
}

export default EmployeeListPage
