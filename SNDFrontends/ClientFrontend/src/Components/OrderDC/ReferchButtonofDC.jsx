import React from 'react'
import { useDispatch } from 'react-redux'
import { getDataFundtion } from '../../Api/CurdFunctions'

import { toast, ToastContainer } from 'react-toastify'
import { fetchOrderDc } from '../../Redux/Reducers/OrderDCReducer'
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer'
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser'
import { fetchLocation } from '../../Redux/Reducers/LocationReducer'
import { fetchStore } from '../../Redux/Reducers/StoreReducer'
import { fetchClient } from '../../Redux/Reducers/ClientReducer'
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer'
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer'
import { fetchproduct } from '../../Redux/Reducers/ProductReducer'
import { fetchSaleOrder } from '../../Redux/Reducers/SaleOrderReducer'



const ReferchButtonofDC = () => {
    const dispatch = useDispatch()
    const getData = async () => {
        try {

            const data = await getDataFundtion("/DcOrder")

            dispatch(fetchOrderDc(data.data))
            const AdminiD = "68903ec2664155e11db10367"
            const res = await getDataFundtion(`/Administrative/get/${AdminiD}`)
            dispatch(fetchAdminReducer(res.data))
            const Accounts = await getDataFundtion('/ChartofAccounts')
            dispatch(fetchChartofAccounts(Accounts.data))
            const product = await getDataFundtion("/product")
            dispatch(fetchproduct(product.data));
            const loction = await getDataFundtion('/Location')
            dispatch(fetchLocation(loction.data))
            const Store = await getDataFundtion("/store")
            dispatch(fetchStore(Store.data))
            const Client = await getDataFundtion("/Customor")
            dispatch(fetchClient(Client.data))
            const OderBooker = await getDataFundtion('/orderbooker')
            dispatch(fetchOrderBooker(OderBooker.data))
            const total = await getDataFundtion('/totalProduct')
            dispatch(fetchTotalProducts(total.data))
             const Order = await getDataFundtion("/SaleOrder")
             dispatch(fetchSaleOrder(Order.data))



        } catch (err) {
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

export default ReferchButtonofDC