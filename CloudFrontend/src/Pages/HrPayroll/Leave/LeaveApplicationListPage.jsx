import React from 'react'
import LeaveApplicationList from '../../../Components/HrPayroll/Leave/LeaveApplicationList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const LeaveApplicationListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Leave Applications</h2>
        <AppButton to="/LeaveApply" icon={<PlusIcon />}>Apply Leave</AppButton>
      </div>
      <LeaveApplicationList />
    </div>
  )
}

export default LeaveApplicationListPage
