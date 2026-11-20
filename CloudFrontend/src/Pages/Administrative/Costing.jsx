import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { createDataFunction, getDataFundtion } from '../../Api/CRUDFunctions';
import AsyncSelect from 'react-select/async';
import { fetchproduct } from '../../Redux/Reducers/ProductReducer';
import AppSelect from '../../Components/Global/AppSelect';
import { exportProfessionalExcel } from '../../utils/exportProfessionalExcel';


const Costing = () => {
    const navigate = useNavigate();

    const { register, handleSubmit, formState: { errors } } = useForm();
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const Store = useSelector((state) => state.Store.Store)
    const [selectedStore, setSelectedStore] = useState(false)
    const [isDistributor, setIsDistributor] = useState(false)
    const [dateFrom, setDateFrom] = useState("2025-07-01")
    const [dateTo, setDateTo] = useState(new Date().toISOString().split("T")[0])
    const [disabled, setdisabled] = useState(false)
    const [results, setResults] = useState(null)
    const [previewRates, setPreviewRates] = useState(null)
    const [loadingPreview, setLoadingPreview] = useState(false)
    const [reportData, setReportData] = useState(null)
    const [loadingReport, setLoadingReport] = useState(false)
    const [activeTab, setActiveTab] = useState("costing")
    const [avgRateData, setAvgRateData] = useState(null)
    const [loadingAvgRate, setLoadingAvgRate] = useState(false)
    const [recalculatingAvgRate, setRecalculatingAvgRate] = useState(false)

    const [products, setProducts] = useState({})
    const [storeNames, setStoreNames] = useState({})
    const [locationNames, setLocationNames] = useState({})

    const StoreDrp = Store.map((item) => {
        return { value: item._id, label: item.StoreName }
    })

    // Load products, stores, locations for name mapping
    useEffect(() => {
        const loadNames = async () => {
            try {
                const [prodRes, storeRes, locRes] = await Promise.all([
                    getDataFundtion('/product'),
                    getDataFundtion('/Store'),
                    getDataFundtion('/location'),
                ]);
                // Product ID -> Name map
                const prodMap = {};
                (prodRes.data || prodRes || []).forEach(p => { prodMap[p._id] = p.ProductName; });
                setProducts(prodMap);
                // Store ID -> Name map
                const storeMap = {};
                (storeRes.data || storeRes || []).forEach(s => { storeMap[s._id] = s.StoreName; });
                setStoreNames(storeMap);
                // Location ID -> Name map
                const locMap = {};
                (locRes.data || locRes || []).forEach(l => { locMap[l._id] = l.LocationName; });
                setLocationNames(locMap);
            } catch (err) {
                console.error('Failed to load names:', err);
            }
        };
        loadNames();
    }, []);

    // Preview purchase rates before recalculating
    const loadPreview = async () => {
        try {
            setLoadingPreview(true)
            const storeParam = selectedStore ? `&Store=${selectedStore}` : '';
            const res = await getDataFundtion(`/Costing/rates?endDate=${dateTo}${storeParam}`)
            setPreviewRates(res)
            toast.success(`Found ${res.totalProducts} product-wise rates (with Opening Inventory)`)
        } catch (err) {
            toast.error("Failed to load purchase rates")
        } finally {
            setLoadingPreview(false)
        }
    }

    const onSubmit = async (data) => {
        try {
            setdisabled(true)
            setResults(null)

            const payload = {
                startDate: dateFrom,
                endDate: dateTo,
            };
            if (selectedStore) {
                payload.Store = selectedStore;
            }
            if (isDistributor) {
                payload.Distributor = true;
            }

            console.log("Calling /Costing/recalculate with:", payload)
            const res = await createDataFunction('/Costing/recalculate', payload)

            setResults(res)
            toast.success(res.message || "Cost Recalculated Successfully")
        }
        catch (err) {
            console.error(err)
            return toast.error("Something went wrong")
        } finally {
            setdisabled(false)
        }
    }

    // Load Avg Rate Report
    const loadAvgRateReport = async () => {
        try {
            setLoadingAvgRate(true)
            const storeParam = selectedStore ? `&Store=${selectedStore}` : '';
            const res = await getDataFundtion(`/Costing/avg-rate-report?startDate=${dateFrom}&endDate=${dateTo}${storeParam}`)
            setAvgRateData(res)
            toast.success(`Avg Rate Report loaded: ${res.totalProducts} products`)
        } catch (err) {
            toast.error("Failed to load avg rate report")
        } finally {
            setLoadingAvgRate(false)
        }
    }

    // Recalculate with Avg Rates
    const recalculateWithAvgRates = async () => {
        if (!avgRateData || !avgRateData.data) {
            return toast.error("Please load avg rate report first")
        }
        try {
            setRecalculatingAvgRate(true)
            const payload = {
                startDate: dateFrom,
                endDate: dateTo,
                rateData: avgRateData.data,
            };
            if (selectedStore) {
                payload.Store = selectedStore;
            }
            if (isDistributor) {
                payload.Distributor = true;
            }
            console.log("Calling /Costing/recalculate-with-rates with:", payload)
            const res = await createDataFunction('/Costing/recalculate-with-rates', payload)
            setResults(res)
            toast.success(res.message || "Costing Recalculated Successfully with Avg Rates")
        } catch (err) {
            console.error(err)
            toast.error("Something went wrong during recalculation")
        } finally {
            setRecalculatingAvgRate(false)
        }
    }

    const exportPreviewRatesToExcel = async () => {
        if (!previewRates?.data?.length) {
            return toast.error("Please preview rates first");
        }
        const excelData = previewRates.data.map((item, idx) => ({
            '#': idx + 1,
            Product: products[item.product] || item.product,
            Store: storeNames[item.Store] || item.Store,
            'Opening Qty': Number(item.openingQty || 0),
            'Opening Value': Number(item.openingValue || 0),
            'Purchase Qty': Number(item.purchaseQty || 0),
            'Purchase Value': Number(item.purchaseValue || 0),
            'Combined Qty': Number(item.combinedQty || item.totalBox || 0),
            'Combined Value': Number(item.combinedValue || item.totalGrossAmount || 0),
            'Rate/Box': Number(item.ratePerBox || 0).toFixed(4),
            Invoices: item.invoiceCount || 0,
        }));
        await exportProfessionalExcel({
            title: 'Purchase Rates Preview',
            fileName: `Costing_Preview_Rates_${dateFrom}_to_${dateTo}`,
            sheetName: 'Preview Rates',
            rows: excelData,
            meta: [
                `Period: ${dateFrom} to ${dateTo}`,
                `Department: ${selectedStore ? (storeNames[selectedStore] || selectedStore) : 'All Departments'}`,
                previewRates.financialYear
                    ? `Financial Year: ${previewRates.financialYear.start} to ${previewRates.financialYear.end}`
                    : '',
                `Rate = (Opening Value + Purchase Value) / (Opening Qty + Purchase Qty)`,
            ].filter(Boolean),
            excludeKeys: ['_id', 'id'],
        });
    };

    const loadReport = async () => {
        try {
            setLoadingReport(true)
            const storeParam = selectedStore ? `&Store=${selectedStore}` : '';
            const res = await getDataFundtion(`/Costing/report?endDate=${dateTo}${storeParam}`)
            setReportData(res)
            toast.success(`Report loaded: ${res.totalRows} rows`)
        } catch (err) {
            toast.error("Failed to load report")
        } finally {
            setLoadingReport(false)
        }
    }

    return (
        <div className="p-4">
            <ToastContainer />
            <h1 className="text-3xl font-bold text-center mb-6">Costing & Purchase Report</h1>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 justify-center">
                <button
                    onClick={() => setActiveTab("costing")}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${activeTab === "costing" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                    Costing Recalculate
                </button>
                <button
                    onClick={() => setActiveTab("report")}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${activeTab === "report" ? "bg-green-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                    Purchase Report
                </button>
                <button
                    onClick={() => setActiveTab("avgrate")}
                    className={`px-6 py-2 rounded-lg font-semibold transition ${activeTab === "avgrate" ? "bg-purple-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                >
                    Avg Rate Report
                </button>
            </div>

            {activeTab === "costing" && (
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 rounded-lg shadow-md">
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Process:</strong> System auto-detects Financial Year from Opening Inventory based on your Date To.
                        Then fetches Opening Qty + Purchases from FY start to your Date To.<br/>
                        <strong>Rate = (OpeningValue + PurchaseGrossAmount) / (OpeningQty + PurchaseTotalBox)</strong><br/>
                        Then recalculate all posted Sales Invoice "Co Vouchers" (untick For Distributor) OR "DC Vouchers" (tick For Distributor) with new rates.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                    <div className="flex items-end">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isDistributor}
                                onChange={(e) => setIsDistributor(e.target.checked)}
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold">For Distributor</span>
                        </label>
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-5">
                    <button
                        type="button"
                        onClick={loadPreview}
                        disabled={loadingPreview}
                        className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition text-sm md:text-base"
                    >
                        {loadingPreview ? "Loading..." : "Preview Rates"}
                    </button>
                    <button
                        type="submit"
                        disabled={disabled}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base"
                    >
                        {disabled ? "Processing..." : "Create Costing"}
                    </button>
                </div>
            </form>

            )}

            {/* ============ PURCHASE REPORT TAB ============ */}
            {activeTab === "report" && (
                <div className="p-6 rounded-lg shadow-md">
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
                            disabled={loadingReport}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm md:text-base"
                        >
                            {loadingReport ? "Loading..." : "Load Report"}
                        </button>
                    </div>
                </div>
            )}

            {/* ============ AVG RATE REPORT TAB ============ */}
            {activeTab === "avgrate" && (
                <div className="p-6 rounded-lg shadow-md">
                    <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <p className="text-sm text-purple-800">
                            <strong>Avg Rate Report:</strong> Shows product-wise average rates including Opening Inventory + Purchases.
                            Load the report first, then click "Recalculate with Avg Rates" to apply these rates to Co/DC Vouchers.
                        </p>
                    </div>
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
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={loadAvgRateReport}
                            disabled={loadingAvgRate}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition text-sm md:text-base"
                        >
                            {loadingAvgRate ? "Loading..." : "Load Avg Rate Report"}
                        </button>
                        <button
                            type="button"
                            onClick={recalculateWithAvgRates}
                            disabled={recalculatingAvgRate || !avgRateData}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm md:text-base disabled:opacity-50"
                        >
                            {recalculatingAvgRate ? "Processing..." : "Recalculate with Avg Rates"}
                        </button>
                    </div>
                </div>
            )}

            {/* Purchase Report Table */}
            {activeTab === "report" && reportData && reportData.data && (
                <div className="mt-6 p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-2">Purchase Report ({reportData.dateRange.startDate} to {reportData.dateRange.endDate})</h2>

                    {/* Grand Total Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{Number(reportData.grandTotal.totalBox).toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Total Boxes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">{Number(reportData.grandTotal.grossAmount).toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Total Gross Amount</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">{Number(reportData.grandTotal.avgRate).toFixed(4)}</div>
                            <div className="text-sm text-gray-600">Avg Rate / Box</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Product</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Department (Store)</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Total Box</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Gross Amount</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Avg Rate</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2 font-medium">{products[item.product] || item.product}</td>
                                        <td className="border border-gray-300 px-3 py-2">{storeNames[item.Store] || item.Store}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">{Number(item.totalBox).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">{Number(item.totalGrossAmount).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700">{Number(item.avgRate).toFixed(4)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">{item.invoiceCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-200 font-bold">
                                <tr>
                                    <td className="border border-gray-300 px-3 py-2" colSpan="3">Grand Total</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">{Number(reportData.grandTotal.totalBox).toLocaleString()}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">{Number(reportData.grandTotal.grossAmount).toLocaleString()}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right text-green-700">{Number(reportData.grandTotal.avgRate).toFixed(4)}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Avg Rate Report Table */}
            {activeTab === "avgrate" && avgRateData && avgRateData.data && (
                <div className="mt-6 p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-2">Avg Rate Report ({avgRateData.dateRange.startDate} to {avgRateData.dateRange.endDate})</h2>
                    {avgRateData.financialYear && (
                        <div className="mb-3 p-3 bg-gray-50 border rounded text-sm">
                            <strong>Financial Year:</strong> {avgRateData.financialYear.start} to {avgRateData.financialYear.end}
                        </div>
                    )}

                    {/* Grand Total Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{Number(avgRateData.grandTotal.totalBox).toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Total Boxes</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">{Number(avgRateData.grandTotal.grossAmount).toLocaleString()}</div>
                            <div className="text-sm text-gray-600">Total Gross Amount</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">{Number(avgRateData.grandTotal.avgRate).toFixed(4)}</div>
                            <div className="text-sm text-gray-600">Avg Rate / Box</div>
                        </div>
                    </div>

                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Product</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Store</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Opening Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Opening Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Purchase Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Purchase Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Combined Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Combined Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right font-bold">Avg Rate</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {avgRateData.data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2 font-medium">{products[item.product] || item.product}</td>
                                        <td className="border border-gray-300 px-3 py-2">{storeNames[item.Store] || item.Store}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">{Number(item.openingQty || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">{Number(item.openingValue || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">{Number(item.purchaseQty || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">{Number(item.purchaseValue || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{Number(item.totalBox || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{Number(item.totalGrossAmount || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700">{Number(item.avgRate).toFixed(4)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">{item.invoiceCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-200 font-bold">
                                <tr>
                                    <td className="border border-gray-300 px-3 py-2" colSpan="3">Grand Total</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right" colSpan="5">-</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right text-green-700">{Number(avgRateData.grandTotal.avgRate).toFixed(4)}</td>
                                    <td className="border border-gray-300 px-3 py-2 text-right">-</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ============ COSTING TAB ============ */}
            {activeTab === "costing" && (
            <>
            {previewRates && previewRates.data && (
                <div className="mt-6 p-4 rounded-lg shadow-md">
                    <div className="flex justify-between items-center mb-4 gap-3 flex-wrap">
                        <h2 className="text-xl font-bold">Purchase Rates Preview (Opening + Purchases)</h2>
                        <button
                            type="button"
                            onClick={exportPreviewRatesToExcel}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm md:text-base"
                        >
                            Download Excel
                        </button>
                    </div>
                    {previewRates.financialYear && (
                        <div className="mb-3 p-3 bg-gray-50 border rounded text-sm">
                            <strong>Financial Year:</strong> {previewRates.financialYear.start} to {previewRates.financialYear.end}
                        </div>
                    )}
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Product</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Store</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Opening Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Opening Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Purchase Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Purchase Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Combined Qty</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Combined Value</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right font-bold">Rate/Box</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">Invoices</th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewRates.data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2 font-medium">{products[item.product] || item.product}</td>
                                        <td className="border border-gray-300 px-3 py-2">{storeNames[item.Store] || item.Store}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">{Number(item.openingQty || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-yellow-50">{Number(item.openingValue || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">{Number(item.purchaseQty || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right bg-blue-50">{Number(item.purchaseValue || 0).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{Number(item.combinedQty || item.totalBox).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-semibold">{Number(item.combinedValue || item.totalGrossAmount).toLocaleString()}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-bold text-green-700">{Number(item.ratePerBox).toFixed(4)}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right">{item.invoiceCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Results Summary */}
            {results && results.data && (
                <div className="mt-6 p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">Costing Results</h2>
                    {results.data.financialYear && (
                        <div className="mb-3 p-3 bg-gray-50 border rounded text-sm">
                            <strong>Financial Year:</strong> {results.data.financialYear.start} to {results.data.financialYear.end} | 
                            <strong>Opening Inventory Products:</strong> {results.data.openingInventoryProducts || 0}
                        </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">{results.data.productsProcessed}</div>
                            <div className="text-sm text-gray-600">Products Processed</div>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-green-600">{results.data.successCount}</div>
                            <div className="text-sm text-gray-600">Co Vouchers Updated</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">{results.data.dcSuccessCount || 0}</div>
                            <div className="text-sm text-gray-600">DC Vouchers Updated</div>
                        </div>
                        <div className="bg-red-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-red-600">{(results.data.errorCount || 0) + (results.data.dcErrorCount || 0)}</div>
                            <div className="text-sm text-gray-600">Total Errors</div>
                        </div>
                    </div>

                    {/* Detailed Results Table */}
                    {results.data.results && results.data.results.length > 0 && (
                        <div className="overflow-x-auto max-h-96">
                            <table className="w-full border-collapse border border-gray-300 text-sm">
                                <thead className="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">Invoice</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                                        <th className="border border-gray-300 px-3 py-2 text-left">Store</th>
                                        <th className="border border-gray-300 px-3 py-2 text-right">New Total Cost</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center">Old Deleted</th>
                                        <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.data.results.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                            <td className="border border-gray-300 px-3 py-2">{item.invoice}</td>
                                            <td className="border border-gray-300 px-3 py-2">{item.date}</td>
                                            <td className="border border-gray-300 px-3 py-2">{item.store}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                                                {item.error ? (
                                                    <span className="text-red-500">-</span>
                                                ) : (
                                                    Number(item.newTotalCost).toLocaleString()
                                                )}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                                {item.oldVoucherDeleted ? "Yes" : "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                                {item.error ? (
                                                    <span className="text-red-500 text-xs">{item.error}</span>
                                                ) : (
                                                    <span className="text-green-600 font-bold">Done</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            </>
            )}

            {/* DC Voucher Results */}
            {results && results.data && results.data.dcResults && results.data.dcResults.length > 0 && (
                <div className="mt-6 p-4 rounded-lg shadow-md">
                    <h2 className="text-xl font-bold mb-4">DC Voucher Results</h2>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full border-collapse border border-gray-300 text-sm">
                            <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                    <th className="border border-gray-300 px-3 py-2 text-left">#</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">DC Code</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Date</th>
                                    <th className="border border-gray-300 px-3 py-2 text-left">Store</th>
                                    <th className="border border-gray-300 px-3 py-2 text-right">New Total Cost</th>
                                    <th className="border border-gray-300 px-3 py-2 text-center">Old Deleted</th>
                                    <th className="border border-gray-300 px-3 py-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.data.dcResults.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 px-3 py-2">{idx + 1}</td>
                                        <td className="border border-gray-300 px-3 py-2">{item.dcCode}</td>
                                        <td className="border border-gray-300 px-3 py-2">{item.date}</td>
                                        <td className="border border-gray-300 px-3 py-2">{item.store}</td>
                                        <td className="border border-gray-300 px-3 py-2 text-right font-bold">
                                            {item.error ? (
                                                <span className="text-red-500">-</span>
                                            ) : (
                                                Number(item.newTotalCost).toLocaleString()
                                            )}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-center">
                                            {item.oldVoucherDeleted ? "Yes" : "-"}
                                        </td>
                                        <td className="border border-gray-300 px-3 py-2 text-center">
                                            {item.error ? (
                                                <span className="text-red-500 text-xs">{item.error}</span>
                                            ) : (
                                                <span className="text-green-600 font-bold">Done</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Costing
