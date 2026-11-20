import React from 'react'
import PaymentReciptList from '../../../Components/Distrbutor/PaymentRecipt/PaymentReciptList'
import { useSelector } from 'react-redux'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'

const PaymentReciptListPage = () => {
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

    return (
       <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Bank Payment Vouchers</h2>
                <div className="flex items-center gap-3">
                    <AppButton to="/PaymentReciptAdd" variant="outline" icon={<PlusIcon />}>Add</AppButton>
                    {loginVendor.isDistributor !== "true" ? (
                        <AppButton to="/RealizePayment">RealizePayment</AppButton>
                    ) : null}
                </div>
            </div>
            <PaymentReciptList />
        </div>
    )
}

export default PaymentReciptListPage
