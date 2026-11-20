import React from 'react'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import OrderDCList from '../../../Components/Distrbutor/OrderDC/OrderDCList'
import OrderDCPostModal from '../../../Components/Distrbutor/OrderDC/OrderDCPostModal'
import OrderDCUnPostModal from '../../../Components/Distrbutor/OrderDC/OrderDCUnPostModal'
import { useSelector } from 'react-redux'

const OrderDCListPage = () => {
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const AddOrderDC = UserRihts.find((item) => item == "Add Order DC")
  const PostOrderDC = UserRihts.find((item) => item == "Post OrderDC")
  const UnPostOrderDC = UserRihts.find((item) => item == "UnPost OrderDC")

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Order DC</h2>
        <div className="flex items-center gap-3">
          {AddOrderDC && (
            <AppButton to="/OrderDCAdd" variant="outline" icon={<PlusIcon />}>
              Add
            </AppButton>
          )}
          <div className="w-px h-6 pd-divider" />
          {PostOrderDC ? <OrderDCPostModal /> : null}
          {UnPostOrderDC ? <OrderDCUnPostModal /> : null}
        </div>
      </div>
      <OrderDCList />
    </div>
  )
}

export default OrderDCListPage