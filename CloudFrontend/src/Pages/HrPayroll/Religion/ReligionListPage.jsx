import React from 'react'
import ReligionList from '../../../Components/HrPayroll/Religion/ReligionList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ReligionListPage = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-5">
      <h2 className="pd-section-title">Religions</h2>
      <AppButton to="/HrReligionAdd" icon={<PlusIcon />}>Add</AppButton>
    </div>
    <ReligionList />
  </div>
)

export default ReligionListPage
