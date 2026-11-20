import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { fetchStore } from '../../../../Redux/Reducers/StoreReducer';

const AccountOpeningBalanceView = () => {
    const dispatch = useDispatch();
    const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts);
    const Store = useSelector((state) => state.Store.Store);
    const filteredAccount = Account.filter((item) => item.AccountCode.length > 5);
    const editOpeningAccount = useSelector((state) => state.AccountOpeningReducer.AccountOpeningReducer);

    const [tableData, setTableData] = useState([]);
    const [formData, setFormData] = useState({ DateStart: '', DateEnd: '' });

    const { id } = useParams();

    const getAccountName = (id) => {
        const acc = Account.find((a) => a._id === id);
        return acc ? `${acc.AccountCode} ${acc.AccountName}` : '';
    };

    const getStoreName = (storeId) => {
        if (!storeId) return '';
        const id = typeof storeId === 'object' ? storeId._id : storeId;
        return Store.find((item) => String(item._id) === String(id))?.StoreName || '';
    };

    const TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

    useEffect(() => {
        const opening = editOpeningAccount.find((item) => item._id == id);
        if (opening) {
            setFormData({
                DateStart: opening.DateStart,
                DateEnd: opening.DateEnd,
            });
            setTableData(opening.AccountsData);
        }
    }, [editOpeningAccount, id]);

    useEffect(() => {
        if (Store?.length) return;
        getDataFundtion('/Store')
            .then((res) => dispatch(fetchStore(res?.data || [])))
            .catch((err) => console.error('Stores not found:', err));
    }, []);

    return (
        <div className="p-4">
            <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">Account Opening (View)</h1>

            <div className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year From</label>
                        <div className="border px-3 py-2 rounded-md pd-bg-muted text-sm">{formData.DateStart}</div>
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year To</label>
                        <div className="border px-3 py-2 rounded-md pd-bg-muted text-sm">{formData.DateEnd}</div>
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">Account</th>
                                <th className="border p-2 min-w-[160px]">Store</th>
                                <th className="border p-2">Debit</th>
                                <th className="border p-2">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, index) => (
                                <tr key={index} className="hover:pd-bg-muted">
                                    <td className="border p-2">{getAccountName(row.Account)}</td>
                                    <td className="border p-2">{getStoreName(row.store || row.Store)}</td>
                                    <td className="border p-2">{row.Debit}</td>
                                    <td className="border p-2">{row.Credit}</td>
                                </tr>
                            ))}
                        </tbody>
                        {tableData.length !== 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2 text-right">Total:</td>
                                    <td className="border p-2"></td>
                                    <td className="border p-2">{TotalDebit}</td>
                                    <td className="border p-2">{TotalCredit}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AccountOpeningBalanceView;
