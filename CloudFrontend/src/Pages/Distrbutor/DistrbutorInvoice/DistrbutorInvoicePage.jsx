import React from 'react'
import DistrbutorInvoice from '../../../Components/Distrbutor/DistrbutorInvoice/DistrbutorInvoiceList'
import { Link } from 'react-router-dom'

const DistrbutorInvoicePage = () => {
    return (
        <>
            <div className="my-5 mx-2 flex gap-4">
                <Link to='/DistrbutorInvoiceAdd'>
                    <button className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2 focus:outline-none">
                        Add
                    </button>
                </Link>
            </div>
            <DistrbutorInvoice />
        </>
    )
}

export default DistrbutorInvoicePage