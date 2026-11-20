import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { fetchClient } from '../../../../Redux/Reducers/ClientReducer';
import { fetchTransport } from '../../../../Redux/Reducers/TransportReducer';
import { fetchCity } from '../../../../Redux/Reducers/CityReducer';
import { fetchChartofAccounts } from '../../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../../Redux/Reducers/AdminReducer';
import { fetchVendor } from '../../../../Redux/Reducers/VendorReducer';
import { fetchChqBook } from '../../../../Redux/Reducers/ChqBookReducer';
import { fetchStore } from '../../../../Redux/Reducers/StoreReducer';
import { fetchDistributroReducers } from '../../../../Redux/Reducers/DistributroReducers';

const ADMIN_ID = '687e14a624a274d5e844be49';

export const fetchBankPaymentVoucherDependencies = async (dispatch) => {
    const accounts = await getDataFundtion('/ChartofAccounts');
    const accounts1 = accounts.data.filter((item)=> item.isActive == true)
    const vendor = await getDataFundtion('/vendor');
    const res = await getDataFundtion(`/Administrative/get/${ADMIN_ID}`);
    const chq = await getDataFundtion('/ChqBook/OpenChq');
    const store = await getDataFundtion('/store');
    const Distributr = await getDataFundtion('/Distrbutor/DistrbutorNameId');
    const City = await getDataFundtion('/City');
    const Transporter = await getDataFundtion('/Transport');
    const customer = await getDataFundtion('/customer/customerNameid');
    const distributor = await getDataFundtion('/Distrbutor/DistrbutorNameId');
    const AllCustomer = customer.data.concat(distributor);

    dispatch(fetchDistributroReducers(Distributr));
    dispatch(fetchStore(store.data));
    dispatch(fetchChqBook(chq.data));
    dispatch(fetchAdminReducer(res.data));
    dispatch(fetchVendor(vendor.data));
    dispatch(fetchCity(City.data));
    dispatch(fetchTransport(Transporter.data));
    dispatch(fetchClient(AllCustomer));
    dispatch(fetchChartofAccounts(accounts1));

    return res.data;
};