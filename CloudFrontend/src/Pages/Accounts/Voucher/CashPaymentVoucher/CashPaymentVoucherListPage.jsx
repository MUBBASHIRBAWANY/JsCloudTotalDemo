import React from 'react'
import CashPaymentVoucherList from '../../../../Components/Accounts/Vouchers/CashPaymentVoucher/CashPaymentVoucherList'
import AppButton, { PlusIcon } from '../../../../Components/Global/AppButton'

const CashPaymentVoucherListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Cash Payment Vouchers</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/CashPaymentVoucherAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                </div>
            </div>
            <CashPaymentVoucherList />
        </div>
    )
}

export default CashPaymentVoucherListPage