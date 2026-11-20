import React from 'react'
import AttendanceList from '../../../Components/HrPayroll/Attendance/AttendanceList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import { FiUpload, FiBarChart2 } from 'react-icons/fi'

const AttendanceListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Attendance</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/AttendanceDashboard" variant="ghost" icon={<FiBarChart2 />}>
            Dashboard
          </AppButton>
          <AppButton to="/AttendanceBulkUpload" icon={<FiUpload />}>
            Bulk Import
          </AppButton>
          <AppButton to="/AttendanceHrMark" icon={<PlusIcon />}>
            Mark Attendance
          </AppButton>
        </div>
      </div>
      <AttendanceList />
    </div>
  )
}

export default AttendanceListPage
