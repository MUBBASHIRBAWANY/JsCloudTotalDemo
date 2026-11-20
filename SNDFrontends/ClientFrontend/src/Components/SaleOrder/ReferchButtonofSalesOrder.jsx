import React from 'react'
import { useDispatch } from 'react-redux'
import { getDataFundtion } from '../../Api/CurdFunctions'
import { fetchSaleOrder } from '../../Redux/Reducers/SaleOrderReducer'
import { fetchStore } from '../../Redux/Reducers/StoreReducer'
import { fetchClient } from '../../Redux/Reducers/ClientReducer'
import { fetchproduct } from '../../Redux/Reducers/ProductReducer'
import { fetchLocation } from '../../Redux/Reducers/LocationReducer'
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser'
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer'
import { toast, ToastContainer } from 'react-toastify'



const ReferchButtonofSalesOrder = () => {
    const dispatch = useDispatch()
    const getData = async () => {
        console.log("first")
        try {
            const data = await getDataFundtion("/saleOrder")
                dispatch(fetchSaleOrder(data.data))
                console.log(data)
                const Store = await getDataFundtion("/store")
                dispatch(fetchStore(Store.data))
                const Client = await getDataFundtion("/Customor")
                dispatch(fetchClient(Client.data))
                const product = await getDataFundtion("/product")
                dispatch(fetchproduct(product.data));
                const loction = await getDataFundtion('/Location')
                dispatch(fetchLocation(loction.data))
                const Accounts = await getDataFundtion('/ChartofAccounts')
                dispatch(fetchChartofAccounts(Accounts.data))
                const OderBooker = await getDataFundtion('/orderbooker')
                dispatch(fetchOrderBooker(OderBooker.data))
            
        } catch (err) {
            toast.error("Error in data fetching")
            console.log(err)
        }

    }
    return (
        <div>
            <ToastContainer />
            <button
                onClick={() => getData()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
                Refresh Button
            </button>
        </div>
    )
}

export default ReferchButtonofSalesOrder