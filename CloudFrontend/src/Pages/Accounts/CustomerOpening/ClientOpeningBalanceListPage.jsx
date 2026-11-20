import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import ClientOpeningBalanceList from '../../../Components/Accounts/OpeningBalance/ClientOpeningBalance/ClientOpeningBalanceList'

const ClientOpeningBalanceListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Client Opening Balances</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/ClientOpeningBalanceAdd" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
          <AppButton to="/ClientOpeningBalanceBulkAdd" icon={<PlusIcon />}>
            Add in Bulk
          </AppButton>
        </div>
      </div>
      <ClientOpeningBalanceList />
    </div>
  )
}

export default ClientOpeningBalanceListPage