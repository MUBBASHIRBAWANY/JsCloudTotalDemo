import React from 'react'
import ReasonList from '../../../Components/HrPayroll/Reason/ReasonList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ReasonListPage = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-5">
      <h2 className="pd-section-title">Reasons (IN/OUT)</h2>
      <AppButton to="/HrReasonAdd" icon={<PlusIcon />}>Add</AppButton>
    </div>
    <ReasonList />
  </div>
)

export default ReasonListPage
