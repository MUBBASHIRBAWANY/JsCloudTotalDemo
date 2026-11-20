import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import AppButton from '../../../Global/AppButton';
import { fetchStore } from '../../../../Redux/Reducers/StoreReducer';
import { exportProfessionalExcel } from '../../../../utils/exportProfessionalExcel';

const DownloadIcon = () => (
    <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v8" />
        <path d="M5 7l3 3 3-3" />
        <path d="M3 13h10" />
    </svg>
);

const ClientOpeningBalanceView = () => {
    const dispatch = useDispatch();
    const Client = useSelector((state) => state.Client.client);
    const Store = useSelector((state) => state.Store.Store);
    const editOpeningClient = useSelector((state) => state.ClientOpeningReducer.ClientOpeningReducer);
    const { id } = useParams();

    const [tableData, setTableData] = useState([]);
    const [dateRange, setDateRange] = useState({ DateStart: '', DateEnd: '' });

    const getData = () => {
        try {
            const data = editOpeningClient.find((item) => item._id === id);
            setTableData(data.ClientData);
            setDateRange({
                DateStart: data.DateStart,
                DateEnd: data.DateEnd
            });
        } catch (err) {
            console.error('Data not found:', err);
        }
    };

    const getStoreName = (storeId) => {
        if (!storeId) return '';
        const id = typeof storeId === 'object' ? storeId._id : storeId;
        return Store.find((item) => String(item._id) === String(id))?.StoreName || '';
    };

    useEffect(() => {
        getData();
        if (Store?.length) return;
        getDataFundtion('/Store')
            .then((res) => dispatch(fetchStore(res?.data || [])))
            .catch((err) => console.error('Stores not found:', err));
    }, []);

    const TotalDebit = tableData.reduce((sum, row) => sum + (parseFloat(row.Debit) || 0), 0);
    const TotalCredit = tableData.reduce((sum, row) => sum + (parseFloat(row.Credit) || 0), 0);

    const downloadExcel = async () => {
        if (!tableData.length) {
            toast.error('No data to export');
            return;
        }
        const rows = tableData.map((row) => {
            const clientInfo = Client.find((c) => c._id === row.Client);
            return {
                Client: clientInfo ? `${clientInfo.mastercode || ''} ${clientInfo.CutomerName || ''}`.trim() : 'N/A',
                Store: getStoreName(clientInfo?.Store),
                Debit: parseFloat(row.Debit) || 0,
                Credit: parseFloat(row.Credit) || 0,
            };
        });
        await exportProfessionalExcel({
            title: 'Client Opening View',
            fileName: `Client_Opening_${dateRange.DateStart || ''}_to_${dateRange.DateEnd || ''}`,
            sheetName: 'Client Opening',
            columns: [
                { header: 'Client', key: 'Client', width: 36 },
                { header: 'Store', key: 'Store', width: 24 },
                { header: 'Debit', key: 'Debit', type: 'number', width: 16 },
                { header: 'Credit', key: 'Credit', type: 'number', width: 16 },
            ],
            rows,
            totals: { Debit: TotalDebit, Credit: TotalCredit },
            meta: [
                dateRange.DateStart ? `Year From: ${String(dateRange.DateStart).slice(0, 10)}` : '',
                dateRange.DateEnd ? `Year To: ${String(dateRange.DateEnd).slice(0, 10)}` : '',
            ],
        });
    };

    return (
        <div className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                <h1 className="text-xl md:text-3xl font-bold pd-text-body">
                    Client Opening View
                </h1>
                <AppButton variant="outline" icon={<DownloadIcon />} onClick={downloadExcel}>
                    Download Excel
                </AppButton>
            </div>

            <div className="pd-card p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year From</label>
                        <p className="border px-3 py-2 rounded pd-bg-muted">
                            {dateRange.DateStart?.slice(0, 10)}
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">Year To</label>
                        <p className="border px-3 py-2 rounded pd-bg-muted">
                            {dateRange.DateEnd?.slice(0, 10)}
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto mb-6">
                    <table className="w-full border-collapse text-sm md:text-base">
                        <thead>
                            <tr className="pd-bg-muted">
                                <th className="border p-2 min-w-[200px]">Client</th>
                                <th className="border p-2 min-w-[160px]">Store</th>
                                <th className="border p-2">Debit</th>
                                <th className="border p-2">Credit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((row, idx) => {
                                const clientInfo = Client.find((c) => c._id === row.Client);
                                return (
                                    <tr key={idx} className="hover:pd-bg-muted">
                                        <td className="border p-2">
                                            {clientInfo
                                                ? `${clientInfo.mastercode} ${clientInfo.CutomerName}`
                                                : 'N/A'}
                                        </td>
                                        <td className="border p-2">{getStoreName(clientInfo?.Store)}</td>
                                        <td className="border p-2">{row.Debit}</td>
                                        <td className="border p-2">{row.Credit}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        {tableData.length > 0 && (
                            <tfoot>
                                <tr className="pd-table-footer">
                                    <td className="border p-2"></td>
                                    <td className="border p-2 text-right">Total:</td>
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

export default ClientOpeningBalanceView;
