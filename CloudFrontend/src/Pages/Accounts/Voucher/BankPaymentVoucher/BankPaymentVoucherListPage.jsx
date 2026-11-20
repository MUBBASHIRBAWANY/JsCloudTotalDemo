import React from 'react'
import BankPaymentVoucherList from '../../../../Components/Accounts/Vouchers/BankPaymentVoucher/BankPaymentVoucherList'
import AppButton, { PlusIcon } from '../../../../Components/Global/AppButton'

const BankPaymentVoucherListPage = () => {
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Bank Payment Vouchers</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/BankPaymentVoucherAdd" variant="outline" icon={<PlusIcon />}>
                        Add
                    </AppButton>
                    <AppButton to="/VoucherUpload">
                        Voucher Upload
                    </AppButton>
                </div>
            </div>
            <BankPaymentVoucherList />
        </div>
    )
}

export default BankPaymentVoucherListPage