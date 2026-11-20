import React from 'react'
import SaleOrderList from '../../Components/SaleOrder/SaleOrderList'
import { Link } from 'react-router-dom'
import SaleOrderPost from '../../Components/SaleOrder/SaleOrderPostModal'
import SaleOrderUnPost from '../../Components/SaleOrder/SaleOrderUnPostModal'
import ReferchButtonofSalesOrder from '../../Components/SaleOrder/ReferchButtonofSalesOrder'

const SaleOrderListPage = () => {
  return (
    <>
      <div className='flex'>
        <Link to='/SaleOrderAdd'>
          <button className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-[0.6vw] py-[0.6vw] me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 w-[5vw] mx-5 my-5'>
            Add
          </button>
        </Link>
        
        <span className='mt-5'>
          <ReferchButtonofSalesOrder />
        </span>
      </div>
      <SaleOrderList />
    </>
  )
}

export default SaleOrderListPage