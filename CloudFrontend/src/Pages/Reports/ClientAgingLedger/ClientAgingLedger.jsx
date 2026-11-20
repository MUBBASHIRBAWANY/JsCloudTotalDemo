import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ClientAgingLedgerPopup from './ClientAgingLedgerPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { toast, ToastContainer } from 'react-toastify';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';

const ClientAgingLedger = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [store, setStore] = useState([])
    const [totalstore, setTotalstore] = useState([])
    const [selectedStore, setSelectedStore] = useState([])
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [totalCustomer, setTotalCustomer] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [value, setValue] = useState(1)

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

    const handleQuickSelect = (selected) => {
        setQuickSelect(selected)
        const today = new Date()
        const todayStr = today.toISOString().split('T')[0]
        if (selected === "MonthToDate") {
            const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
            setSelectedMonth(currentMonth);
            setStartDate(`${currentYear}-${currentMonth}-01`);
            setEndDate(todayStr)
        } else if (selected === "YearToDate") {
            if (!years.length) return;
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

    const mapCustomer = (item) => ({
        value: item._id,
        label: `${item.SalesFlowRef || item.OldCode || ''} ${item.CutomerName || item.DistrbutorName || ''}`.trim(),
        name: item.CutomerName || item.DistrbutorName,
        code: item.SalesFlowRef || item.OldCode || item.code || item.DistrbutorSystemCode,
    })

    const getData = async () => {
        const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
        const yearList = (yearRes || []).map((item) => ({
            label: `${item.DateStart} to ${item.DateEnd}`,
            value: item.DateStart.split('-')[0]
        }));
        setYears(yearList)

        const storeData = await getDataFundtion("/store")
        const allowedStores = (storeData?.data || []).filter((item) =>
            !loginVendor?.Store?.length || loginVendor.Store.includes(item._id)
        )
        setTotalstore(allowedStores.map((item) => item._id))
        setStore(allowedStores.map((item) => ({
            value: item._id,
            label: item.StoreName
        })))

        const distributor = await getDataFundtion("/Distrbutor")
        // Only show distributor customers in Client Aging Ledger (unique by _id)
        const seenIds = new Set()
        const mapped = (Array.isArray(distributor) ? distributor : distributor?.data || [])
            .filter((item) => {
                const id = String(item?._id || '')
                if (!id || seenIds.has(id)) return false
                seenIds.add(id)
                return true
            })
            .map(mapCustomer)
        setTotalCustomer(mapped)
        setCustomerDrp(mapped.slice(0, 50))
        setSelectedCustomer(mapped)
    }

    useEffect(() => {
        getData()
    }, [])

    const loadCustomerOptions = async (inputValue) => {
        if (!inputValue) return [];
        return totalCustomer
            .filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()))
            .slice(0, 50);
    };

    const openPopupTab = async () => {
        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Client Aging Ledger';
        popup.document.body.innerHTML = `<div id="popup-root"></div>`;
        const submitData = {
            startDate,
            endDate,
            Store: selectedStore.length > 0 ? selectedStore : totalstore,
            Customer: selectedCustomer.length > 0 && selectedCustomer.length < totalCustomer.length
                ? selectedCustomer
                : [],
            storeSelected: selectedStore.length > 0,
            PrintedBy: loginVendor?.firstname || ""
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<ClientAgingLedgerPopup filterData={submitData} />);
            }
        }, 100);

        setValue(2)
    }

    return (
        <ReportPageLayout title="Client Aging Ledger">
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
                            onChange={(options) => setSelectedCustomer(options || [])}
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
                            options={store.map(s => ({
                                ...s,
                                label: s.label + ' (Store)'
                            }))}
                            onChange={(options) => {
                                setSelectedStore((options || []).map((opt) => opt.value));
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Department (Store)"
                        />
                    </div>
                    <p className="col-span-1 md:col-span-2 text-xs text-gray-500">
                        Ledger Balance is that client’s Net Balance on Sundry Debtor Balance for the same Date From and Date To, across all departments. Invoice aging is counted from 01 July 2020 to Date To. Pending Payment is unrealized receipts from Payment Realize Report between Date From and Date To (status Pending). If a department is selected, pending receipts are limited to that department. Knockoff comes from Knockoff Remaining — the open credit still left on Knockoff vouchers (Credit − Remain). Difference is (Aging + Pending Payment) + Knockoff − Ledger Balance. When Ledger Balance is negative, Knockoff is added even if Aging + Pending Payment is zero: (Aging + Pending Payment) + Knockoff + Ledger Balance.
                    </p>
                    <div className="col-span-1 md:col-span-2">
                        <button
                            onClick={() => openPopupTab()}
                            className="pd-btn-save w-full"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        </ReportPageLayout>
    )
};

export default ClientAgingLedger;
