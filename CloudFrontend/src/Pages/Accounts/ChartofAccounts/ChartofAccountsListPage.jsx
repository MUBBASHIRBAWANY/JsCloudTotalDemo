import React from 'react'
import ChartofAccountsList from '../../../Components/Accounts/Chart of Accounts/ChartofAccountsList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const ChartofAccountsListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Chart of Accounts</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ChartofAccountsAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ChartofAccountsViwePage">
            Account Tree View
          </AppButton>
        </div>
      </div>
      <ChartofAccountsList />
    </div>
  )
}

export default ChartofAccountsListPage