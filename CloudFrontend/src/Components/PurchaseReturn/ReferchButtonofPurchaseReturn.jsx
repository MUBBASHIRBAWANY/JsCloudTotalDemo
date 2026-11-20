import React from 'react'
import { useDispatch } from 'react-redux'
import { getDataFundtion } from '../../Api/CurdFunctions'
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer'
import { fetchVendor } from '../../Redux/Reducers/VendorReducer'
import { fetchproduct } from '../../Redux/Reducers/ProductReducer'
import { fetchLocation } from '../../Redux/Reducers/LocationReducer'
import { fetchStore } from '../../Redux/Reducers/StoreReducer'
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser'
import { fetchPurchaseReturn } from '../../Redux/Reducers/PurchaseReturnReducer'


const ReferchButtonofPurchaseReturn = () => {
    const dispatch = useDispatch()
    const getData = async () => {
       try {
            const AdminiD = "68903ec2664155e11db10367"
            const res = await getDataFundtion(`/Administrative/get/${AdminiD}`)
            dispatch(fetchAdminReducer(res.data))
            const vendor = await getDataFundtion("/vendor")
            dispatch(fetchVendor(vendor.data))
            const product = await getDataFundtion("/product")
            dispatch(fetchproduct(product.data));
            const loction = await getDataFundtion('/Location')
            dispatch(fetchLocation(loction.data))
            const Store = await getDataFundtion("/store")
            dispatch(fetchStore(Store.data))
            const Accounts = await getDataFundtion('/ChartofAccounts')
            dispatch(fetchChartofAccounts(Accounts.data))
            const data = await getDataFundtion("/PurchaseReturn")
            const list = data.data
            dispatch(fetchPurchaseReturn(list))
        } catch (err) {
            //console.log(err)
        }

    }
    return (
        <div>
            <button
                onClick={() => getData()}
                className="pd-btn-save"
            >
                Refresh Button
            </button>
        </div>
    )
}

export default ReferchButtonofPurchaseReturn