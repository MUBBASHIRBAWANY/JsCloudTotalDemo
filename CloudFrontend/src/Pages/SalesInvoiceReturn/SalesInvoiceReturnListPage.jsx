import React from 'react'
import SalesInvoiceReturnList from '../../Components/SalesInvoiceReturn/SalesInvoiceReturnList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import SalesInvoiceReturnPost from '../../Components/SalesInvoiceReturn/SalesInvoiceReturnPost'
import SalesInvoiceReturnUnPost from '../../Components/SalesInvoiceReturn/UnPostSalesInvoiceReturn'
import { useSelector } from 'react-redux'

const SalesInvoiceReturnListPage = () => {
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const AddSalesReturn = UserRihts.find((item) => item == "Add SalesReturn")
  const AddSalesReturnBulk = UserRihts.find((item) => item == "Add SalesReturn Bulk")
  const PostSalesReturn = UserRihts.find((item) => item == "Post SalesReturn")
  const UnPostSalesReturn = UserRihts.find((item) => item == "UnPost SalesReturn")

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Sales Invoice Returns</h2>
        <div className="flex items-center gap-3">
          {AddSalesReturn && (
            <AppButton to="/SalesInvoiceReturnAdd" variant="outline" icon={<PlusIcon />}>
              Add
            </AppButton>
          )}
          {AddSalesReturnBulk && (
            <AppButton to="/SalesReturnBulkAdd" icon={<PlusIcon />}>
              Add in Bulk
            </AppButton>
          )}
          <div className="w-px h-6 pd-divider" />
          {PostSalesReturn ? <SalesInvoiceReturnPost /> : null}
          {UnPostSalesReturn ? <SalesInvoiceReturnUnPost /> : null}
        </div>
      </div>
      <SalesInvoiceReturnList />
    </div>
  )
}

export default SalesInvoiceReturnListPage