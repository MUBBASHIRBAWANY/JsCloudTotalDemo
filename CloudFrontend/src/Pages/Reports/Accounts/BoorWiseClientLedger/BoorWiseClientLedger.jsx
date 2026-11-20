// ClientLedger.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import BoorWiseClientLedgerPopup from './BoorWiseClientLedgerPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import AppAsyncSelect from '../../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';



const BoorWiseClientLedger = ({
    handleLocationChange,
    locationOptions,
    storeOptions,
    isLoading
}) => {


    const status = [
        { label: "Post", value: "Post" },
        { label: "UnPost", value: "UnPost" },
        { label: "Both", value: "Both" }
    ];
    const [qtyType, setQtyType,] = useState('Box')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [location, setLocation] = useState([])
    const [storeforDrp, setStoreForDrp] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [slectedStore, setSlectedStore] = useState('')
    const [Store, setStore] = useState('')
    const [Clients, setClients] = useState("")
    const [City, setCity] = useState([])
    const [sales, setsales] = useState([])

    const [OrderderBooker, SetOrderderBooker] = useState([])
    const [SelectedBooker, setSelectedBooker] = useState('')
//console.log(SelectedBooker)
    const [chartofAccount, setchartofAccount] = useState("")
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

        const filtered = OrderderBooker
            .filter((item) =>
                (item?.label?.toLowerCase().includes(search))
            )
            .slice(0, 50);

        return filtered.map((item) => ({
            label: `${item.label}`,
            value: item.value,
        }));
    };



    const getProduct = async () => {

        const Location = await getDataFundtion("/Location")
        const Store = await getDataFundtion("/Store")


        const Client = await getDataFundtion("/customer")

        setsales(sales)
        const Distrbutor = await getDataFundtion("/Distrbutor/DistrbutorNameId")
        const DitriButorOrderBooker = await getDataFundtion("/DitriButorOrderBooker")
        const AllClinets = loginVendor.isDistributor == "true" ? Distrbutor : Client.data.concat(Distrbutor)
        setClients(AllClinets)
        setStoreForDrp(Store.data)
        const City = await getDataFundtion("/City")
        setCity(City.data)
        const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
        const yearList = yearRes.map((item) => ({
            label: `${item.DateStart} to ${item.DateEnd}`,
            value: item.DateStart.split('-')[0]
        }));
        setYears(yearList)

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
        const totalStore = [0]
        const allstoreValue = loginVendor.Store.map((item) => totalStore.push(item))
        setSlectedStore(totalStore)
        setStore(headOffice.concat(allstore))

        //console.log(loginVendor)

        const StartingClients = DitriButorOrderBooker.data?.map((item) => ({
            value: item._id,
            label: `${item.OrderBookerName}`,
        }));;
        SetOrderderBooker(StartingClients)

    }
    //console.log(slectedStore)
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
            store: slectedStore,
            Clients: Clients,
            City : City,
            Booker: SelectedBooker,
            AcName: OrderderBooker.find((item) => item.value == SelectedBooker).label,
            AcCode: OrderderBooker.find((item) => item.value == SelectedBooker).label,
            PrintedBy: `${loginVendor.firstname}`,
            sales: sales,
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<BoorWiseClientLedgerPopup data={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }

    const [showPopup, setShowPopup] = useState(false);
    const [value, setValue] = useState(1)

    return (
    <ReportPageLayout title="Booker Wise Ledger">
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
                        <label className="block text-sm font-medium">Orderder Booker</label>
                        <AppAsyncSelect
                            cacheOptions
                            onChange={(selectedOption) =>
                                setSelectedBooker(selectedOption.value)
                            }
                            loadOptions={loadInvoiceOptions}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select OrderderBooker"
                            defaultOptions={OrderderBooker}
                        />

                    </div>
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

export default BoorWiseClientLedger;