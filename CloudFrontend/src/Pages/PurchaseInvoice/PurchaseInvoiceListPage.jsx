import React from 'react'
import PurchaseInvoiceList from '../../Components/PurchaseInvoice/PurchaseInvoiceList'
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import InvoiceSelectionModal from '../../Components/PurchaseInvoice/InvoiceSelectionModal'
import { useSelector } from 'react-redux'

const PurchaseInvoiceListPage = () => {
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const AddPurchase = UserRihts.find((item) => item == "Add Purchase")
  const AddPurchaseBulk = UserRihts.find((item) => item == "Add Purchase Bulk")
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">Purchase Invoices</h2>
        <div className="flex items-center gap-3">
          {AddPurchase && (
            <AppButton to="/PurchaseInvoiceAdd" variant="outline" icon={<PlusIcon />}>
              Add
            </AppButton>
          )}
          <div className="w-px h-6 pd-divider" />
          <InvoiceSelectionModal />
        </div>
      </div>
      <PurchaseInvoiceList />
    </div>
  )
}

export default PurchaseInvoiceListPage