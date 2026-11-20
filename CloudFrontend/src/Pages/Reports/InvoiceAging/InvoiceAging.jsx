import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';

import { useDispatch, useSelector } from 'react-redux';
import InvoiceAgingPopup from './InvoiceAgingPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { set } from 'react-hook-form';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';




const InvoiceAging = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()

    const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [defaultCustomer, setDefaultCustomer] = useState([])
    const [totalCustomer, setTotalCustomer] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
    const [ChartofAccounts, setChartofAccounts] = useState([])
    const [value, setValue] = useState(1)
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState([])
    const [totalstore, setTotalstore] = useState([])
    const [selectedStore, setSelectedStore] = useState([])

    const [sepratechq, setSepratechq] = useState("No")
    const [withRemarks, setWithRemarks] = useState("with")
    const [orderBooker, setOrderBooker] = useState([])
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')

    const quickSelectOptions = [
        { label: "Custom", value: "Custom" },
        { label: "Year to Date", value: "YearToDate" },
        { label: "Month to Date", value: "MonthToDate" }
    ];

    const currentYear = new Date().getFullYear();

    const monthOptions = [
        { label: "January", value: "01" },
        { label: "February", value: "02" },
        { label: "March", value: "03" },
        { label: "April", value: "04" },
        { label: "May", value: "05" },
        { label: "June", value: "06" },
        { label: "July", value: "07" },
        { label: "August", value: "08" },
        { label: "September", value: "09" },
        { label: "October", value: "10" },
        { label: "November", value: "11" },
        { label: "December", value: "12" }
    ];

    const handleQuickSelect = (value) => {
        setQuickSelect(value)
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        if (value === "MonthToDate") {
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(currentMonth);
            const firstDay = `${currentYear}-${currentMonth}-01`;
            setStartDate(firstDay);
            setEndDate(todayStr)
        } else if (value === "YearToDate") {
            const [start, end] = years.at(-1).label.split(" to ");
            setSelectedYear(years.at(-1).value)
            setStartDate(start)
            setEndDate(end)
        }
    }

    const handleYearChange = (year) => {
        setSelectedYear(year.value)
        const [start, end] = year.label.split(" to ");
        if (quickSelect === "YearToDate") {
            setStartDate(start)
            setEndDate(end)
        }
    }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(firstDay);
        setEndDate(lastDay);
    }

    const Loader = () => (
        <div className="flex items-center justify-center h-screen">
            <div className="w-12 h-12 border-4 border-[color:var(--pd-primary)] border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const getData = async () => {
        setLoading(true)
        try {
            const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
            const yearList = yearRes.map((item) => ({
                label: `${item.DateStart} to ${item.DateEnd}`,
                value: item.DateStart.split('-')[0]
            }));
            setYears(yearList)

            const orderBooker = await getDataFundtion("/OrderBooker")
            const DitriButorOrderBooker = await getDataFundtion("/DitriButorOrderBooker")
            const ALlBooker =  DitriButorOrderBooker.data.concat(orderBooker.data)
            
            setOrderBooker(ALlBooker.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))

            const client = await getDataFundtion("/customer")
            const distributor = await getDataFundtion("/Distrbutor")
            let Customer
            if (LoginerVendor.IsDistibutor !== "true"){
                Customer = client.data.concat(distributor)

            }
            else {
                Customer = distributor
            }
            setCustomerDrp(Customer.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef || item.OldCode} ${item.CutomerName || item.DistrbutorName}`,
                name: item.CutomerName || item.DistrbutorName,
                code: item.code || item.DistrbutorSystemCode,
                NTN: item.NTN,
                OrderBooker : item.OrderBooker,
                STN: item.STN,
                Address: item.Address,
                SalesFlowRef: item.SalesFlowRef || item.OldCode,
            })).slice(0, 50))


            setTotalCustomer(Customer.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef || item.OldCode} ${item.CutomerName || item.DistrbutorName}`,
                name: item.CutomerName || item.DistrbutorName,
                code: item.code || item.DistrbutorSystemCode,
                NTN: item.NTN,
                OrderBooker : item.OrderBooker,
                STN: item.STN,
                Address: item.Address,
                SalesFlowRef: item.SalesFlowRef || item.OldCode,

            })))

            setSelectedCustomer(Customer.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef || item.OldCode} ${item.CutomerName || item.DistrbutorName}`,
                name: item.CutomerName || item.DistrbutorName,
                code: item.code || item.DistrbutorSystemCode,
                NTN: item.NTN,
                OrderBooker : item.OrderBooker,
                STN: item.STN,
                Address: item.Address,
                SalesFlowRef: item.SalesFlowRef || item.OldCode,
            })))

            setDefaultCustomer(Customer.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef || item.OldCode} ${item.CutomerName || item.DistrbutorName}`,
                name: item.CutomerName || item.DistrbutorName,
                code: item.code || item.DistrbutorSystemCode,
                NTN: item.NTN,
                STN: item.STN,
                OrderBooker : item.OrderBooker,
                Address: item.Address,
                SalesFlowRef: item.SalesFlowRef || item.OldCode,
            })))
            const accounts = await getDataFundtion("/ChartofAccounts")
            setChartofAccounts(accounts.data)

            const storeData = await getDataFundtion("/store")
            const assignedStoreIds = (LoginerVendor?.Store || [])
                .map((id) => String(id?._id || id))
                .filter(Boolean)
            const allowedStores = (storeData?.data || []).filter((item) =>
                assignedStoreIds.length === 0 || assignedStoreIds.includes(String(item._id))
            )

            setTotalstore(allowedStores.map((item) => item._id))
            const storeOptions = allowedStores.map((item) => ({
                value: item._id,
                label: item.StoreName
            }))
            setStore(storeOptions)

        } catch (err) {
            //console.log(err)
        }
        setLoading(false)

    }


    useEffect(() => {
        getData()
    }, [])



    const loadCustomerOptions = async (inputValue) => {
        //console.log(totalCustomer)
        if (!inputValue) return [];

        const filtered = totalCustomer
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered
    };

    if (loading) {
        return <Loader />
    }
    const openPopupTab = async () => {

        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    
    </div>`;
        const defultBooker = [{
            value: "0",
            label: ""
        }]
        const submitData = {
            startDate: startDate,
            endDate: endDate,
            Customer: selectedCustomer.length > 0 ? selectedCustomer : defaultCustomer,
            ChartofAccounts: ChartofAccounts,
            Store: selectedStore.length > 0 ? selectedStore : totalstore,
            sepratechq: sepratechq,
            withRemarks: withRemarks,
            orderBooker: defultBooker.concat(orderBooker)
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<InvoiceAgingPopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    return (
        <ReportPageLayout title="Invoice Aging">
        <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">
            <ToastContainer />
            <div className="grid grid-cols-5 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Quick Select</label>
                    <AppSelect
                        options={quickSelectOptions}
                        value={quickSelectOptions.find(opt => opt.value === quickSelect)}
                        onChange={(e) => handleQuickSelect(e.value)}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select..."
                    />
                </div>
                {quickSelect === "YearToDate" && (
                    <div>
                        <label className="block text-sm font-medium">Select Year</label>
                        <AppSelect
                            options={years}
                            value={years.find(y => y.value === selectedYear)}
                            onChange={(e) => handleYearChange(e)}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Year..."
                        />
                    </div>
                )}
                    {quickSelect === "MonthToDate" && (
                        <div>
                            <label className="block text-sm font-medium">Select Month</label>
                            <AppSelect
                                options={monthOptions}
                                value={monthOptions.find(m => m.value === selectedMonth)}
                                onChange={(e) => handleMonthChange(e)}
                                className="basic-single"
                                classNamePrefix="pd-select"
                                isSearchable
                                placeholder="Select Month..."
                            />
                        </div>
                    )}
                <div>
                    <label className="block text-sm font-medium">Date From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        
                        className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== "Custom" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">Date To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        
                        className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== "Custom" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                    />
                </div>

                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Customer</label>
                    <AppAsyncSelect
                        isMulti
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedCustomer(selectedValues);
                        }}

                        loadOptions={loadCustomerOptions}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Customer"
                        defaultOptions={CustomerDrp}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Department</label>
                    <AppSelect
                        isMulti
                        options={store}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt.value);
                            setSelectedStore(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Store"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium">Separate Cheque</label>
                    <input type="radio" id="seprated" name='seprated' value={"No"} onChange={(e) => setSepratechq(e.target.value)} /> <label htmlFor="seprated">No</label>
                    <input type="radio" id="seprated1" name='seprated' value={"Yes"} onChange={(e) => setSepratechq(e.target.value)} /> <label htmlFor="seprated1">Yes</label>
                </div>
                <br />
                <div>
                    <label className="block text-sm font-medium">Remarks Filter</label>
                    <input type="radio" id="withRemarks" name='remarksFilter' value={"with"} checked={withRemarks === "with"} onChange={(e) => setWithRemarks(e.target.value)} /> <label htmlFor="withRemarks">With Remarks</label>
                    <br />
                    <input type="radio" id="withoutRemarks" name='remarksFilter' value={"without"} checked={withRemarks === "without"} onChange={(e) => setWithRemarks(e.target.value)} /> <label htmlFor="withoutRemarks">Without Remarks</label>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <button
                        onClick={() => openPopupTab()}
                        className={`pd-btn-save w-full `}
                    >
                        Submit
                    </button>
                </div>
            </div>

        </div>
        </ReportPageLayout>
    )
}

export default InvoiceAging