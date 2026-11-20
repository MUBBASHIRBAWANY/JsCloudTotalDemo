import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import { fetchTransport } from '../../../Redux/Reducers/TransportReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchChartofAccounts } from '../../../Redux/Reducers/ChartofAccountsReduser';
import { fetchAdminReducer } from '../../../Redux/Reducers/AdminReducer';
import { fetchVendor } from '../../../Redux/Reducers/VendorReducer';
import { fetchChqBook } from '../../../Redux/Reducers/ChqBookReducer';
import { fetchStore } from '../../../Redux/Reducers/StoreReducer';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';
import { fetchRemaininginvoice } from '../../../Redux/Reducers/Remaininginvoice';
import { fetchOpeningInvoices } from '../../../Redux/Reducers/OpeningInvoicesReducer';
import { fetchEmployeeSubAccounts } from '../../../Redux/Reducers/EmployeeSubAccountReducer';
import { EMPLOYEE_SUB_ACCOUNT_KINDS } from './employeeSubAccounts';

const ADMIN_ID = '687e14a624a274d5e844be49';

export const fetchAllVoucherDependencies = async (dispatch) => {
    try {
        const [
            accountsRes,
            vendorRes,
            adminRes,
            chqRes,
            storeRes,
            distributorRes,
            cityRes,
            transportRes,
            customerRes,
            remainingInvoiceRes,
            openingInvoiceRes,
        ] = await Promise.all([
            getDataFundtion('/ChartofAccounts'),
            getDataFundtion('/vendor'),
            getDataFundtion(`/Administrative/get/${ADMIN_ID}`),
            getDataFundtion('/ChqBook/OpenChq'),
            getDataFundtion('/store'),
            getDataFundtion('/Distrbutor/DistrbutorNameId'),
            getDataFundtion('/City'),
            getDataFundtion('/Transport'),
            getDataFundtion('/customer/customerNameid'),
            getDataFundtion('/SaleInvoice/getOnlyRemainInvoiceAmount'),
            getDataFundtion('/OpeningInvoice'),
        ]);
const activeAccounts = (accountsRes.data || []).filter((item) => item.isActive === true);
        const distributorList = Array.isArray(distributorRes) ? distributorRes : (distributorRes.data || []);
        const allCustomer = (customerRes.data || []).concat(distributorList);
        const transportList = Array.isArray(transportRes)
            ? transportRes
            : (transportRes?.data || []);
        const openingRows = Array.isArray(openingInvoiceRes?.data)
            ? (openingInvoiceRes.data[0]?.InvoiceData || [])
            : [];

        dispatch(fetchChartofAccounts(activeAccounts));
        dispatch(fetchVendor(vendorRes.data || []));
        dispatch(fetchAdminReducer(adminRes.data));
        dispatch(fetchChqBook(chqRes.data || []));
        dispatch(fetchStore(storeRes.data || []));
        dispatch(fetchDistributroReducers(distributorList));
        dispatch(fetchCity(cityRes.data || []));
        dispatch(fetchTransport(transportList));
        dispatch(fetchClient(allCustomer));
        dispatch(fetchRemaininginvoice((remainingInvoiceRes.data || []).concat(distributorList)));
        dispatch(fetchOpeningInvoices(openingRows));

        const groups = { EBF: [], Loan: [], Advance: [], BadDebt: [] };
        await Promise.all(EMPLOYEE_SUB_ACCOUNT_KINDS.map(async (kind) => {
            try {
                const res = await getDataFundtion(kind.endpoint);
                groups[kind.field] = res?.data || [];
            } catch (accountError) {
                groups[kind.field] = [];
            }
        }));
        dispatch(fetchEmployeeSubAccounts(groups));

        return true;
    } catch (err) {
        console.error('Failed to fetch voucher dependencies:', err);
        throw err;
    }
};
