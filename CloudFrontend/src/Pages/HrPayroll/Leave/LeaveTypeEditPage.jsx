import React from 'react'
import LeaveTypeForm from '../../../Components/HrPayroll/Leave/LeaveTypeForm'

const LeaveTypeEditPage = () => {
  return (
    <div className="p-6">
      <div className="mb-5">
        <h2 className="pd-section-title">Edit Leave Type</h2>
      </div>
      <LeaveTypeForm />
    </div>
  )
}

export default LeaveTypeEditPage
