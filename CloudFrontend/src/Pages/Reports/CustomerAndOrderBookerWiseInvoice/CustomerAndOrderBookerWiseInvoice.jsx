// CustomerAndOrderBookerWiseInvoice.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import CustomerAndOrderBookerWiseInvoicePopup from './CustomerAndOrderBookerWiseInvoicePopup';
import ReactDOM from 'react-dom/client';
import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';



const CustomerAndOrderBookerWiseInvoice = ({
    handleLocationChange,
    locationOptions,
    storeOptions,
    isLoading
}) => {



    const [City, setCity] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [location, setLocation] = useState([])
    const [storeforDrp, setStoreForDrp] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [slectedStore, setSlectedStore] = useState('')
    const [Produts, setProduts] = useState([])
    const [OrderderBooker, SetOrderderBooker] = useState([])
    const [Store, setStore] = useState([])
    const [Clients, setClients] = useState("")
    const [sales, setsales] = useState([])
    const [DisSales, setDisSales] = useState([])
    const [totalClients, settotalClients] = useState([])
    const [selectedOrderBooker, setselectedOrderBooker] = useState("")
    const [stratClients, setStratClients] = useState([])
    const [SelectedClient, setSelectedClient] = useState('')
    const [chartofAccount, setchartofAccount] = useState("")
    const [BookerWise, setBookerWise] = useState("Client")
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

    const loadInvoiceOptions = async (inputValue) => {
        if (!inputValue) return [];

        const search = inputValue.toLowerCase();

        const filtered = Clients
            .filter((item) =>
                (item?.CutomerName?.toLowerCase().includes(search)) ||
                (item?.DistrbutorName?.toLowerCase().includes(search)) ||
                (item?.SalesFlowRef?.toLowerCase().includes(search)) ||
                (item?.OldCode?.toLowerCase().includes(search))
            )
            .slice(0, 50);

        return filtered.map((item) => ({
            label: `${item.CutomerName || item.DistrbutorName} ${item.SalesFlowRef || item.OldCode || ""} ${item.City || ""}` || "Unknown",
            value: item._id,
        }));
    };



    const getProduct = async () => {

        const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
        const yearList = yearRes.map((item) => ({
            label: `${item.DateStart} to ${item.DateEnd}`,
            value: item.DateStart.split('-')[0]
        }));
        setYears(yearList)

        const Location = await getDataFundtion("/Location")
        const Store = await getDataFundtion("/Store")
        const chartofAccount = await getDataFundtion("/chartofAccounts/Stage4")
        setchartofAccount(chartofAccount.data)
        const City = await getDataFundtion("/City")
        const Disinvoice = await getDataFundtion("/DistrbutorInvoice/getDisInvoiceNumber")
        setCity(City.data)
        setDisSales(Disinvoice)
        const Distrbutor = await getDataFundtion("/Distrbutor")
        const DitriButorOrderBooker = await getDataFundtion("/DitriButorOrderBooker")
        const allDistributors = Array.isArray(Distrbutor) ? Distrbutor : (Distrbutor?.data || [])
        const cityDistributors = loginVendor?.OnlyDist === true
            ? allDistributors.filter((item) => String(item.City) === String(loginVendor.City))
            : allDistributors
        const AllClinets = cityDistributors
        setClients(AllClinets)
        setStoreForDrp(Store.data)
        settotalClients(AllClinets)
        setSelectedLocation(loginVendor.Location)
        //console.log(storeforDrp.push(0))
        const allstore = Store.data.map((item) => ({
            label: item.StoreName,
            value: item._id,
        }));
        const headOffice = [{
            label: "Head Office",
            value: "0",
        }]

        const cityBookerIds = new Set(cityDistributors.map((item) => String(item.OrderBooker)).filter(Boolean))
        const allOrderBookers = DitriButorOrderBooker.data || []
        const visibleOrderBookers = loginVendor?.OnlyDist === true
            ? allOrderBookers.filter((item) => cityBookerIds.has(String(item._id)))
            : allOrderBookers
        const OrderBooker = visibleOrderBookers.map((item) => ({
            value: item._id,
            label: `${item.OrderBookerName}`,
        }));;
        SetOrderderBooker(OrderBooker)
        const product = await getDataFundtion("/product/getProductNameId")
        setProduts(product)
        setSlectedStore(Store)
        setStore(headOffice.concat(allstore))

        //console.log(loginVendor)

        const StartingClients = AllClinets?.slice(0, 50)?.map((item) => ({
            label: `${item.CutomerName || item.DistrbutorName} ${item.SalesFlowRef || item.OldCode || ""} ${item.City || ""}` || "",
            value: item._id,
        }));;
        setStratClients(StartingClients)

    }

    useEffect(() => {
        getProduct()
    }, [])
    const openPopupTab = async () => {

        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    
    </div>`;
        const submitData = {
            startDate: startDate,
            endDate: endDate,
            Store: Store,
            marge: loginVendor.isDistributor ? true : false,
            Client: totalClients,
            SelectedClient : SelectedClient,
            BookerWise: BookerWise,
            selectedOrderBooker: selectedOrderBooker,
            AcName: Clients.find((item) => item._id == SelectedClient)?.CutomerName || Clients.find((item) => item._id == SelectedClient)?.DistrbutorName,
            AcCode: Clients.find((item) => item._id == SelectedClient)?.SalesFlowRef || Clients.find((item) => item._id == SelectedClient)?.OldCode,
            PrintedBy: `${loginVendor.firstname}`,
            sales: sales,
            Produts : Produts,
            DisSales: DisSales,
            City: City
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<CustomerAndOrderBookerWiseInvoicePopup data={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }

    const [showPopup, setShowPopup] = useState(false);
    const [value, setValue] = useState(1)

    return (
    <ReportPageLayout title="Order Booker Wise Invoice">
        <>
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
                        <label className="block text-sm font-medium">Wise</label>
                        <AppSelect
                            onChange={(e) => setBookerWise(e.value)}
                            defaultValue={{
                                label: "Client",
                                value: "Client"
                            }}
                            options={[
                                {
                                    label: "Client",
                                    value: "Client"
                                },
                                {
                                    label: "OrderBooker",
                                    value: "OrderBooker"
                                },

                            ]}>

                        </AppSelect>

                    </div>
                    {BookerWise == "Client" ?
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium">Client</label>
                            <AppAsyncSelect
                                cacheOptions
                                onChange={(selectedOption) =>
                                    setSelectedClient(selectedOption.value)
                                }
                                loadOptions={loadInvoiceOptions}
                                className="basic-single"
                                classNamePrefix="pd-select"
                                isSearchable
                                placeholder="Select Client"
                                defaultOptions={stratClients}
                            />

                        </div>
                        : <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium">OrderBooker</label>
                            <AppSelect
                                onChange={(e) => setselectedOrderBooker(e)}
                                options={OrderderBooker}>

                            </AppSelect>
                        </div>

                    }
                    <div className="col-span-1 md:col-span-2">
                        <button
                            onClick={() => openPopupTab()}
                            disabled={isLoading}
                            className={`pd-btn-save w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {isLoading ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </div>

            </div>
        </>
    </ReportPageLayout>
    )

};

export default CustomerAndOrderBookerWiseInvoice;
