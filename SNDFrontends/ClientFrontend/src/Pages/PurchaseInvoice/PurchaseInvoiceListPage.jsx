import React from 'react'
import PurchaseInvoiceList from '../../Components/PurchaseInvoice/PurchaseInvoiceList'
import { Link } from 'react-router-dom'
import InvoiceSelectionModal from '../../Components/PurchaseInvoice/InvoiceSelectionModal'
import InvoiceUnpostModal from '../../Components/PurchaseInvoice/InvoiceUnpostModal'
import ReferchButton from '../../Components/PurchaseInvoice/ReferchButton'

const PurchaseInvoiceListPage = () => {
  return (
    <>
      <div className='flex'>
        <div className='flex justify-between'>
          <Link to='/PurchaseInvoiceAdd'>
            <button className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-[0.6vw] py-[0.6vw] me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 w-[5vw] mx-5 my-5'>
              Add
            </button>
          </Link>
          <span className='my-5'>
            <ReferchButton />
          </span>
        </div>
        <span className='ml-[50%] mt-5' >
          <InvoiceSelectionModal />
        </span>
        <span className='px-[1vw] mt-5'>
          <InvoiceUnpostModal />
        </span>

      </div>

      <PurchaseInvoiceList />
    </>
  )
}

export default PurchaseInvoiceListPage