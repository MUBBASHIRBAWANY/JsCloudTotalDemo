import React from 'react'
import TransferOutList from '../../Components/TransferOut/TransferOutList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import TransferoutPostModal from '../../Components/TransferOut/TransferoutPostModal'
import TransferoutUnpostModal from '../../Components/TransferOut/TransferOutUnpostModal'
import { useSelector } from 'react-redux'

const TransferOutListPage = () => {
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const AddTransferOut = UserRihts.find((item) => item == "Add TransferOut")
    const AddTransferOutBulk = UserRihts.find((item) => item == "Add TransferOut Bulk")
    const PostTransferOut = UserRihts.find((item) => item == "Post TransferOut")
    const UnPostTransferOut = UserRihts.find((item) => item == "UnPost TransferOut")
    return (
        <div className="p-6">
            <div className="flex items-center justify-between mb-5">
                <h2 className="pd-section-title">Transfer Out</h2>
                <div className="flex items-center gap-3">
                    {AddTransferOut && (
                        <AppButton to="/TransferOutAdd" variant="outline" icon={<PlusIcon />}>
                            Add
                        </AppButton>
                    )}
                    {AddTransferOutBulk && (
                        <AppButton to="/TransferOutBuklAdd" icon={<PlusIcon />}>
                            Add in Bulk
                        </AppButton>
                    )}
                    <div className="w-px h-6 pd-divider" />
                    {PostTransferOut ? <TransferoutPostModal /> : null}
                    {UnPostTransferOut ? <TransferoutUnpostModal /> : null}
                </div>
            </div>
            <TransferOutList />
        </div>
    )
}

export default TransferOutListPage