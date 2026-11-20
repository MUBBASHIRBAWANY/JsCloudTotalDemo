import React from 'react'
import DesignationList from '../../../Components/HrPayroll/Designation/DesignationList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const DesignationListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Designations</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/DesignationAdd" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <DesignationList />
    </div>
  )
}

export default DesignationListPage
