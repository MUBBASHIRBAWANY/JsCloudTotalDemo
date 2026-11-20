import React from 'react'
import LeaveTypeList from '../../../Components/HrPayroll/Leave/LeaveTypeList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const LeaveTypeListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Leave Types</h2>
        <AppButton to="/LeaveTypeAdd" icon={<PlusIcon />}>Add</AppButton>
      </div>
      <LeaveTypeList />
    </div>
  )
}

export default LeaveTypeListPage
