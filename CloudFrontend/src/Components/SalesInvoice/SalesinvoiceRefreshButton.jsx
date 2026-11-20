import React from 'react'
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { fetchLocation } from '../../Redux/Reducers/LocationReducer';
import { fetchStore } from '../../Redux/Reducers/StoreReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { fetchSalesInvoice } from '../../Redux/Reducers/SalesInvoiceReducer';
import { fetchOrderDc } from '../../Redux/Reducers/OrderDCReducer';
import { fetchTotalProducts } from '../../Redux/Reducers/TotalProductsReducer';
import { fetchAdminReducer } from '../../Redux/Reducers/AdminReducer';
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';
import { useDispatch } from 'react-redux';

const SalesinvoiceRefreshButton = () => {
    const dispatch = useDispatch()
    const getData = async () => {
        try {
            const AdminiD = "68903ec2664155e11db10367"
            const response = await getDataFundtion(`/SaleInvoice`);
            const customer = await getDataFundtion("/Customor");
            const product = await getDataFundtion("/product");
            const orderBooker = await getDataFundtion("/OrderBooker");
            const store = await getDataFundtion("/store");
            const Location = await getDataFundtion('/Location')
            const AllProducts = await getDataFundtion("/TotalProduct")
            const onTrueDc = await getDataFundtion("DcOrder/OnlyTrue")
            const res = await getDataFundtion(`/Administrative/get/${AdminiD}`)
            const list = response.data;
            const Accounts = await getDataFundtion('/ChartofAccounts')
            dispatch(fetchChartofAccounts(Accounts.data))
            dispatch(fetchLocation(Location.data))
            dispatch(fetchStore(store.data));
            dispatch(fetchproduct(product.data));
            dispatch(fetchClient(customer.data));
            dispatch(fetchOrderBooker(orderBooker.data));
            dispatch(fetchSalesInvoice(list));
            dispatch(fetchOrderDc(onTrueDc.data))
            dispatch(fetchTotalProducts(AllProducts.data))
            dispatch(fetchAdminReducer(res.data))

        } catch (err) {
            //console.log(err);
            toast.error("Error in data fetching")
        }

    };

    return (
        <div>
            <ToastContainer />
            <button
                onClick={() => getData()}
                className="pd-btn-save px-4 py-1"
            >
                Refresh Button
            </button>
        </div>
    )
}

export default SalesinvoiceRefreshButton