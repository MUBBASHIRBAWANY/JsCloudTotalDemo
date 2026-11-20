import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';

import { useDispatch } from 'react-redux';
import ChqTransictionReportPopup from './ChqTransictionReportPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { set } from 'react-hook-form';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';



const ChqTransictionReport = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [AllStore, setAllStore] = useState([])
    const dispatch = useDispatch()
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [Status, setStatus] = useState("All")
    const [defaultCustomer, setDefaultCustomer] = useState([])
    const [totalCustomer, setTotalCustomer] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
    const [ChartofAccounts, setChartofAccounts] = useState([])
    const [value, setValue] = useState(1)
    const [loading, setLoading] = useState(true)
    const [store, setStore] = useState([])
    const [totalstore, setTotalstore] = useState([])
    const [selectedStore, setSelectedStore] = useState([])
    const [selectchqType , setSelectchqType] = useState("ChqDate")
    const [orderBooker, setOrderBooker] = useState([])
    const [invoice, setInvoice] = useState([])
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [merge, setMerge] = useState(false)

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

            const Customer = await getDataFundtion("/customer")
            setCustomerDrp(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef} ${item.CutomerName}`,
                name: item.CutomerName,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address,
                SalesFlowRef: item.SalesFlowRef,
            })).slice(0, 50))


            setTotalCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef} ${item.CutomerName}`,
                name: item.CutomerName,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address,
                SalesFlowRef: item.SalesFlowRef,

            })))



            setDefaultCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.SalesFlowRef} ${item.CutomerName}`,
                name: item.CutomerName,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                SalesFlowRef: item.SalesFlowRef,
                Address: item.Address
            })))

            const storeData = await getDataFundtion("/store")
            //console.log(storeData)
            const OrderBooker = await getDataFundtion("/OrderBooker")
            setTotalOrderBooker(OrderBooker.data)
            setAllStore(storeData.data)
            const invoiceData = await getDataFundtion("/SaleInvoice/OnlyNumberWithouStatus")
            setInvoice(invoiceData)
            setTotalstore(storeData.data.map((item) => item._id))
            const storeOptions = storeData.data.map((item) => ({
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


const  chqType =[
    {label: "Cheque Rcvd Date" , value :"ChqDate" },
    {label: "Recived Date" , value :"RecOrRejectDate" },
    {label: "RealizeDate" , value :"RealizeDate" },
    {label: "Deposit Date" , value :"DepositOrReturn" }
]
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

        const statusValue =
            Status == null || Status === "" || Status === "All"
                ? "All"
                : typeof Status === "object"
                    ? (Status.value || Status.label || "All")
                    : Status;

        const sortByValue =
            typeof selectchqType === "object" && selectchqType !== null && !Array.isArray(selectchqType)
                ? (selectchqType.value || "ChqDate")
                : (Array.isArray(selectchqType) || !selectchqType ? "ChqDate" : selectchqType);

        // Only treat a concrete store option as a filter; [] / null = all stores
        const storeFilter =
            selectedStore && !Array.isArray(selectedStore) && (selectedStore.value || selectedStore.label)
                ? selectedStore
                : null;

        const submitData = {
            startDate: startDate,
            endDate: endDate,
            Store: storeFilter,
            invoice: Array.isArray(invoice) ? invoice : (invoice?.data || []),
            Status: statusValue,
            SortBy: String(sortByValue || "ChqDate"),
            AllStore: AllStore,
            Customer: defaultCustomer,
            AllOrderBooker: totalOrderBooker,
            merge: merge,
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<ChqTransictionReportPopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    const StatusOptions = [
        { value: 'All', label: 'All' },
        { value: 'Pending', label: 'Pending' },
        { value: 'Received', label: 'Received' },
        { value: 'Reject', label: 'Reject' },
        { value: 'Deposit', label: 'Deposit' },
        { value: 'ReturntoCustomer', label: 'ReturntoCustomer' },
        { value: 'Return to customer', label: 'Return to customer' },
        { value: 'Bounce', label: 'Bounce' },
        { value: 'Clear', label: 'Clear' },
        { value: 'Realize', label: 'Realize' },
    ];
    return (
        <ReportPageLayout title="Cheque Transaction Report">
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
                    <label className="block text-sm font-medium">Department</label>
                    <AppSelect
                        options={store}
                        onChange={(options) => {
                            setSelectedStore(options);
                        }}
                        className="basic-single"
                        isClearable={true}
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Store"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Sort By</label>
                    <AppSelect
                        options={chqType}
                        onChange={(options) => {
                            setSelectchqType(options.value);
                        }}
                        className="basic-single"
                        isClearable={true}
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Cheque Type"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Status</label>
                    <AppSelect
                        options={StatusOptions}
                        onChange={(options) => {
                            setStatus(options?.value ?? "All");
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        isClearable={true}
                        placeholder="Select Status"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="flex items-center gap-2 text-sm font-medium mt-6">
                        <input
                            type="checkbox"
                            checked={merge}
                            onChange={(e) => setMerge(e.target.checked)}
                            className="w-4 h-4 accent-[var(--pd-primary)]"
                        />
                        Merge by Cheque Number
                    </label>
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

export default ChqTransictionReport