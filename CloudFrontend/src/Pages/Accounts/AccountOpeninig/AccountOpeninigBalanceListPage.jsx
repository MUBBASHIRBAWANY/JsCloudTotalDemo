import React from 'react'
import AccountOpeningBalanceList from '../../../Components/Accounts/OpeningBalance/AccountBalance/AccountOpeninigBalanceList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const AccountOpeninigBalanceListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Account Opening Balance</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/AccountOpeningBalanceAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <AccountOpeningBalanceList />
        </div>
    )
}

export default AccountOpeninigBalanceListPage