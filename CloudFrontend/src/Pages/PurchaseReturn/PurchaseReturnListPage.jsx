import React from 'react'
import PurchaseReturnList from '../../Components/PurchaseReturn/PurchaseReturnList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import PurchaseReturnReturnPost from '../../Components/PurchaseReturn/PurchaseReturnPostModal'
import PurchaseReturnReturnUnPost from '../../Components/PurchaseReturn/PurchaseReturnUnPostModal'
import { useSelector } from 'react-redux'

const PurchaseReturnListPage = () => {
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const AddPurchaseReturn = UserRihts.find((item) => item == "Add PurchaseReturn")
    const AddPurchaseReturnBulk = UserRihts.find((item) => item == "Add PurchaseReturn Bulk")
    const PostPurchaseReturn = UserRihts.find((item) => item == "Post PurchaseReturn")
    const UnPostPurchaseReturn = UserRihts.find((item) => item == "UnPost PurchaseReturn")
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Purchase Returns</h2>
                <div className="flex items-center gap-3">
                    {AddPurchaseReturn && (
                        <AppButton to="/PurchaseReturnAdd" variant="outline" icon={<PlusIcon />}>
                            Add
                        </AppButton>
                    )}
                    {AddPurchaseReturnBulk && (
                        <AppButton to="/PurchaseReturnBulkAdd" icon={<PlusIcon />}>
                            Add in Bulk
                        </AppButton>
                    )}
                    <div className="w-px h-6 pd-divider" />
                    {PostPurchaseReturn ? <PurchaseReturnReturnPost /> : null}
                    {UnPostPurchaseReturn ? <PurchaseReturnReturnUnPost /> : null}
                </div>
            </div>
            <PurchaseReturnList />
        </div>
    )
}

export default PurchaseReturnListPage