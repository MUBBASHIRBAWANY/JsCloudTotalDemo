import React from 'react'
import AppButton, { PlusIcon } from '../../../../Components/Global/AppButton'
import BankReciptVoucherList from '../../../../Components/Accounts/Vouchers/BankReciptVoucher/BankReciptVoucherList'

const BankReciptVoucherListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Bank Receipt Vouchers</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/BankReciptVoucherAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <BankReciptVoucherList />
        </div>
    )
}

export default BankReciptVoucherListPage