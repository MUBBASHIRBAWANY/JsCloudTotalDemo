import React from 'react'
import HolidayCalendarList from '../../../Components/HrPayroll/HolidayCalendar/HolidayCalendarList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const HolidayCalendarListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Holiday Calendar</h2>
        <AppButton to="/HolidayCalendarAdd" icon={<PlusIcon />}>Add</AppButton>
      </div>
      <HolidayCalendarList />
    </div>
  )
}

export default HolidayCalendarListPage
