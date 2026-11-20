import React from 'react'
import VendorOpenigBalanceList from '../../../Components/Accounts/OpeningBalance/VendorOpenigBalance/VendorOpenigBalanceList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const VendorOpenigBalanceListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Vendor Opening Balances</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/VendorOpenigBalanceAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <VendorOpenigBalanceList />
        </div>
    )
}

export default VendorOpenigBalanceListPage