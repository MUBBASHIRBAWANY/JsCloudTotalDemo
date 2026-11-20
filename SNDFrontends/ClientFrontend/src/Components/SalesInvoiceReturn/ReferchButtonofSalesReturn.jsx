import React from 'react'
import { fetchChartofAccounts } from '../../Redux/Reducers/ChartofAccountsReduser';
import { fetchSalesInvoiceReturn } from '../../Redux/Reducers/SalesInvoiceReturnReducer';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import { fetchClient } from '../../Redux/Reducers/ClientReducer';
import { fetchOrderBooker } from '../../Redux/Reducers/OrderBookerReducer';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';

const ReferchButtonofSalesReturn = () => {
    const getData = async () => {
        const dispatch = useDispatch()
        try {
            const response = await getDataFundtion(`/SalesInvoiceReturn?page=${page + 1}&limit=${pageSize}`);
            console.log(`/SaleInvoice?page=${page + 1}&limit=${pageSize}`);
            const customer = await getDataFundtion("/Customor");
            const Accounts = await getDataFundtion("/ChartofAccounts")
            const product = await getDataFundtion("/product");
            const orderBooker = await getDataFundtion("/OrderBooker");
            const list = response.data;
        
            dispatch(fetchChartofAccounts(Accounts.data))
            dispatch(fetchSalesInvoiceReturn(sortedInvoice));
            dispatch(fetchproduct(product.data));
            dispatch(fetchClient(customer.data));
            dispatch(fetchOrderBooker(orderBooker.data));


        } catch (err) {
            toast.error("Error in data fetching")
            console.log(err);
        }

    };

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

export default ReferchButtonofSalesReturn