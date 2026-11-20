import React from 'react'
import SalesInvoiceList from '../../Components/SalesInvoice/SalesInvoiceList'
import AppButton, { PlusIcon } from '../../../Components/Global/AppButton.jsx'
import SaleInvoicePostModal from '../../Components/SalesInvoice/SaleInvoicePostModal'
import SaleInvoiceUnPostModal from '../../Components/SalesInvoice/SaleInvoiceUnpostModal'
import SaleInvoiceFilterPostModal from '../../Components/SalesInvoice/SaleInvoiceFilterModal'
import SalesinvoiceRefreshButton from '../../Components/SalesInvoice/SalesinvoiceRefreshButton'
import { useSelector } from 'react-redux'

const SalesInvoiceListPage = () => {
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const AddSales = UserRihts.find((item) => item == "Add Sales")
  const AddSalesBulk = UserRihts.find((item) => item == "Add Sales Bulk")
  const PostSales = UserRihts.find((item) => item == "Post Sales")
  const UnPostSales = UserRihts.find((item) => item == "UnPost Sales")

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Sales Invoices</h2>
        <div className="flex items-center gap-3">
          {AddSales && (
            <AppButton to="/SalesInvoiceAdd" variant="outline" icon={<PlusIcon />}>
              Add
            </AppButton>
          )}
          <SalesinvoiceRefreshButton />
          <div className="w-px h-6 pd-divider" />
          {PostSales ? <SaleInvoicePostModal /> : null}
          {UnPostSales ? <SaleInvoiceUnPostModal /> : null}
        </div>
      </div>
      <SalesInvoiceList />
    </div>
  )
}

export default SalesInvoiceListPage