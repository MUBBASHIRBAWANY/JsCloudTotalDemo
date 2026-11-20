import React from 'react'
import LeaveTypeForm from '../../../Components/HrPayroll/Leave/LeaveTypeForm'

const LeaveTypeAddPage = () => {
  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="pd-section-title">Add Leave Type</h2>
      </div>
      <LeaveTypeForm />
    </div>
  )
}

export default LeaveTypeAddPage
