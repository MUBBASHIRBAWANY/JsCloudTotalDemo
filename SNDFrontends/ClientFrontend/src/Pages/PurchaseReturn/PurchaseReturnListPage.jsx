import React from 'react'
import PurchaseReturnList from '../../Components/PurchaseReturn/PurchaseReturnList'
import { Link } from 'react-router-dom'
import PurchaseReturnReturnPost from '../../Components/PurchaseReturn/PurchaseReturnPostModal'
import PurchaseReturnReturnUnPost from '../../Components/PurchaseReturn/PurchaseReturnUnPostModal'
import ReferchButtonofPurchaseReturn from '../../Components/PurchaseReturn/ReferchButtonofPurchaseReturn'

const PurchaseReturnListPage = () => {
    return (
        <>
            <div className='flex'>
                <div className='flex justify-between'>
                    <Link to='/PurchaseReturnAdd'>
                        <button className='text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-[0.6vw] py-[0.6vw] me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800 w-[5vw] mx-5 my-5'>
                            Add
                        </button>
                    </Link>
                    <span className='my-5'>
                        <ReferchButtonofPurchaseReturn />
                    </span>
                </div>

                <span className='ml-[50%] mt-5' >
                    <PurchaseReturnReturnPost />
                </span>
                <span className='px-[1vw] mt-5'>
                    <PurchaseReturnReturnUnPost />
                </span>

            </div>

            <PurchaseReturnList />
        </>
    )
}

export default PurchaseReturnListPage