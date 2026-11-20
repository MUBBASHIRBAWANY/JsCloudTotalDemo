import React from 'react'
import ContractorList from '../../../Components/HrPayroll/Contractor/ContractorList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ContractorListPage = () => (
  <div className="p-6">
    <div className="flex items-center justify-between mb-5">
      <h2 className="pd-section-title">Contractors</h2>
      <AppButton to="/HrContractorAdd" icon={<PlusIcon />}>Add</AppButton>
    </div>
    <ContractorList />
  </div>
)

export default ContractorListPage
