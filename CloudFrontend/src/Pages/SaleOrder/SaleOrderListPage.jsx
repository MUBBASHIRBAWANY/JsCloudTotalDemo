import React from 'react'
import SaleOrderList from '../../Components/SaleOrder/SaleOrderList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton'
import ReferchButtonofSalesOrder from '../../Components/SaleOrder/ReferchButtonofSalesOrder'
import SaleOrderPostModal from '../../Components/SaleOrder/SaleOrderPostModal'
import SaleOrderUnPostModal from '../../Components/SaleOrder/SaleOrderUnPostModal'
import { useSelector } from 'react-redux'

const SaleOrderListPage = () => {
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const AddSaleOrder = UserRihts.find((item) => item == "Add SaleOrder")
  const PostSaleOrder = UserRihts.find((item) => item == "Post SaleOrder")
  const UnPostSaleOrder = UserRihts.find((item) => item == "UnPost SaleOrder")

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Sale Orders</h2>
        <div className="flex items-center gap-3">
          {AddSaleOrder && (
            <AppButton to="/SaleOrderAdd" variant="outline" icon={<PlusIcon />}>
              Add
            </AppButton>
          )}
          <ReferchButtonofSalesOrder />
          <div className="w-px h-6 pd-divider" />
          {PostSaleOrder ? <SaleOrderPostModal /> : null}
          {UnPostSaleOrder ? <SaleOrderUnPostModal /> : null}
        </div>
      </div>
      <SaleOrderList />
    </div>
  )
}

export default SaleOrderListPage