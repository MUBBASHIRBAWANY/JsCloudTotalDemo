import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import AppSelect from '../../../Components/Global/AppSelect';
import { exportProfessionalExcel } from '../../../utils/exportProfessionalExcel';

const AvgRateReport = () => {
    const Store = useSelector((state) => state.Store.Store);
    const [selectedStore, setSelectedStore] = useState(false);
    const [dateFrom, setDateFrom] = useState("2025-07-01");
    const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0]);
    const [loading, setLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [products, setProducts] = useState({});
    const [Refproducts, setRefProducts] = useState({});
    const [storeNames, setStoreNames] = useState({});

    const StoreDrp = Store.map((item) => ({
        value: item._id,
        label: item.StoreName
    }));

    // Load product and store names
    useEffect(() => {
        const loadNames = async () => {
            try {
                const [prodRes, storeRes] = await Promise.all([
                    getDataFundtion('/product'),
                    getDataFundtion('/Store'),
                ]);
                const prodMap = {};
                const prodRefMap = {};
                (prodRes.data || prodRes || []).forEach(p => {
                    prodMap[p._id] = p.ProductName;
                    prodRefMap[p._id] = p.salesFlowRef || '';
                });
                setProducts(prodMap);
                setRefProducts(prodRefMap);
                const storeMap = {};
                (storeRes.data || storeRes || []).forEach(s => { storeMap[s._id] = s.StoreName; });
                setStoreNames(storeMap);
            } catch (err) {
                console.error('Failed to load names:', err);
            }
        };
        loadNames();
    }, []);

    const loadReport = async () => {
        try {
            setLoading(true);
            setReportData(null);
            const storeParam = selectedStore ? `&Store=${selectedStore}` : '';
            const res = await getDataFundtion(`/Costing/avg-rate-report?startDate=${dateFrom}&endDate=${dateTo}${storeParam}`);
            setReportData(res);
            toast.success(`Report loaded: ${res.totalProducts} products`);
        } catch (err) {
            toast.error("Failed to load avg rate report");
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = async () => {
        if (!reportData || !reportData.data) return;
        const excelData = reportData.data.map((item, idx) => ({
            '#': idx + 1,
            'SalesFlowRef': Refproducts[item.product] || '',
            'Product': products[item.product] || item.product,
            'Department (Store)': storeNames[item.Store] || item.Store,
            'Opening Qty': Number(item.openingQty || 0),
            'Opening Value': Number(item.openingValue || 0),
            'Purchase Qty': Number(item.purchaseQty || 0),
            'Purchase Value': Number(item.purchaseValue || 0),
            'Total Qty': Number(item.totalBox),
            'Total Value': Number(item.totalGrossAmount),
            'Avg Rate': Number(item.avgRate).toFixed(4),
            'Invoices': item.invoiceCount,
        }));
        excelData.push({
            '#': '',
            'SalesFlowRef': '',
            'Product': 'Grand Total',
            'Department (Store)': '',
            'Opening Qty': '',
            'Opening Value': '',
            'Purchase Qty': '',
            'Purchase Value': '',
            'Total Qty': reportData.grandTotal.totalBox,
            'Total Value': reportData.grandTotal.grossAmount,
            'Avg Rate': Number(reportData.grandTotal.avgRate).toFixed(4),
            'Invoices': '-',
        });
        await exportProfessionalExcel({
            title: 'Avg Rate Report',
            fileName: `Avg_Rate_Report_${dateFrom}_to_${dateTo}`,
            sheetName: 'Avg Rate Report',
            rows: excelData,
            meta: [
                `Period: ${dateFrom} to ${dateTo}`,
                `Department: ${selectedStore ? (storeNames[selectedStore] || selectedStore) : 'All Departments'}`,
                reportData.financialYear ? `Financial Year: ${reportData.financialYear.start} to ${reportData.financialYear.end}` : '',
            ].filter(Boolean),
            excludeKeys: ['_id', 'id'],
        });
    };

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-3xl font-bold text-center mb-6">Avg Rate Report</h1>

            {/* Filter Section */}
            <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm text-purple-800">
                    <strong>Process:</strong> System auto-detects Financial Year from Opening Inventory based on your Date To. Purchases fetched from FY start to Date To. <br/>
                    <strong>Rate = (OpeningValue + PurchaseGrossAmount) / (OpeningQty + PurchaseTotalBox)</strong>
                </p>
            </div>
            <div className="p-6 rounded-lg shadow-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block font-semibold mb-2">Date From</label>
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2">Date To</label>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>
                    <div>
                        <label className="block font-semibold mb-2">Department (Optional)</label>
                        <AppSelect
                            options={[{ value: false, label: "All Departments" }, ...StoreDrp]}
                            onChange={(v) => setSelectedStore(v.value)}
                            value={StoreDrp.find(opt => opt.value === selectedStore) || { value: false, label: "All Departments" }}
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={loadReport}
                        disabled={loading}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm md:text-base"
                    >
                        {loading ? "Loading..." : "Load Report"}
                    </button>
                </div>
            </div>

            {/* Report Table */}
            {reportData && reportData.data && (
                <div className="p-4 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">
                            Avg Rate Report ({reportData.dateRange.startDate} to {reportData.dateRange.endDate})
                        </h2>
                        <button
                            onClick={exportToExcel}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm md:text-base"
                        >
                            Download Excel
                        </button>
                    </div>
                    {reportData.financialYear && (
                        <div className="mb-3 p-3 bg-gray-50 border rounded text-sm">
                            <strong>Financial Year:</strong> {reportData.financialYear.start} to {reportData.financialYear.end}
                        </div>
                    )}

                    {/* Grand Total Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                                {Number(reportData.grandTotal.totalBox).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">Total Boxes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {Number(reportData.grandTotal.grossAmount).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">Total Gross Amount</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {Number(reportData.grandTotal.avgRate).toFixed(4)}
                            </div>
                            <div className="text-sm text-gray-600">Avg Rate / Box</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">SalesFlowRef</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Product</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Department (Store)</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Opening Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Opening Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Purchase Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Purchase Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Total Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Total Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right font-bold">Avg Rate</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-xs">{Refproducts[item.product]}</td>
                                        <td className="border border-gray-300 px-3 py-2 font-medium">
                                            {products[item.product] || item.product}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2">
                                            {storeNames[item.Store] || item.Store}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">
                                            {Number(item.openingQty || 0).toLocaleString()}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">
                                            {Number(item.openingValue || 0).toLocaleString()}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                                            {Number(item.purchaseQty || 0).toLocaleString()}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">
                                            {Number(item.purchaseValue || 0).toLocaleString()}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                            {Number(item.totalBox).toLocaleString()}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">
                                            {Number(item.totalGrossAmount).toLocaleString()}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700">
                                            {Number(item.avgRate).toFixed(4)}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">
                                            {item.invoiceCount}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-200 font-bold">
                                <tr>
                                    <td className="border border-gray-300 px-3 py-2" colSpan="5">Grand Total</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">
                                        {Number(reportData.grandTotal.totalBox).toLocaleString()}
                                    </td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">
                                        {Number(reportData.grandTotal.grossAmount).toLocaleString()}
                                    </td>
                                    <td className="border border-gray-300 px-3 py-2 text-right text-green-700">
                                        {Number(reportData.grandTotal.avgRate).toFixed(4)}
                                    </td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AvgRateReport;
