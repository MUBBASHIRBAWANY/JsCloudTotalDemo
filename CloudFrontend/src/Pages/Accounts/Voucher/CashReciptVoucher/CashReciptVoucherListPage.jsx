import React from 'react'
import CashReciptVoucherList from '../../../../Components/Accounts/Vouchers/CashReciptVoucher/CashReciptVoucherList'
import AppButton, { PlusIcon } from '../../../../Components/Global/AppButton'

const CashReciptVoucherListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Cash Receipt Vouchers</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/CashReciptVoucherAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <CashReciptVoucherList />
        </div>
    )
}

export default CashReciptVoucherListPage