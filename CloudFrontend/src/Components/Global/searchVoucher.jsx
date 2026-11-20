import { toast } from 'react-toastify';
import { getDataFundtion } from '../../Api/CRUDFunctions';

/**
 * Search vouchers by voucher number from the server.
 * - Empty number  → reloads the full list for the given voucher type.
 * - With a number → fetches that single voucher by number.
 * Returns the rows array ready to be set into the DataGrid.
 */
export const searchVoucherByNumber = async ({ number = '', voucherType = '' }) => {
    const trimmed = String(number || '').replace(/\s+/g, '');

    if (trimmed === '') {
        const res = await getDataFundtion(`/Voucher?&VoucherType=${voucherType}`);
        return res.data || [];
    }

    const res = await getDataFundtion(`/Voucher/getOnlyVoucherByNumber/${trimmed}`);
    const voucher = res.data;

    if (!voucher) {
        toast.error('Voucher not found');
        return [];
    }

    // Sirf us voucher type ke results dikhao jo list page ka hai (BR main BR, CR main CR, JV main JV)
    if (voucherType && voucher.VoucherType !== voucherType) {
        toast.error(`${voucher.VoucherType} voucher is not shown in ${voucherType} list`);
        return [];
    }

    return [voucher];
};
