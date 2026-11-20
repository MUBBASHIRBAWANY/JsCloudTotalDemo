// ClientLedger.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import ClientLedgerPopup from './ClientLedgerPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import AppAsyncSelect from '../../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';



const ClientLedger = ({
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
    const [Clients, setClients] = useState([])
    const [sales, setsales] = useState([])
    const [DisSales, setDisSales] = useState([])
    const [isDataLoading, setIsDataLoading] = useState(true)

    const [stratClients, setStratClients] = useState([])
    const [SelectedClient, setSelectedClient] = useState('')
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

    // Build client option labels the same way as Knockoff (NoqoffAmount)
    const getClientLabel = (item) => {
        if (item?.DistrbutorName) {
            return `${item.DistrbutorName} (Distributor)`;
        }
        return `${item.CutomerName || item.Client} ${item.SalesFlowRef ? `(${item.SalesFlowRef})` : ''} (Customer)`;
    };

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
            label: getClientLabel(item),
            value: item._id,
        }));
    };



    const getProduct = async () => {
        setIsDataLoading(true)
        // 🔥 Load client data first (in parallel) so the dropdown is ready fast
        //    — same quick approach as NoqoffAmount
        try {
        const [Client, City, Distrbutor] = await Promise.all([
            getDataFundtion("/Customer/customerNameid"),
            getDataFundtion("/City"),
            getDataFundtion("/Distrbutor"),
        ]);
        const totalCity = City.data
        const totalDistrbutor = Distrbutor.map((item) => ({
            ...item,
            DistrbutorName:
                item.DistrbutorName +
                ` (${totalCity.find((city) => city._id === item.City)?.CityName || ""})`,
        }));
        let allowDist = []
        if(loginVendor.OnlyDist == true){
            allowDist = totalDistrbutor.filter((item) =>item.City == loginVendor.City)
        }
        else {
            allowDist = totalDistrbutor
        }
        const AllClinets = loginVendor.isDistributor == "true" ? allowDist : Client.data.concat(allowDist)
        setClients(AllClinets)
        const StartingClients = AllClinets?.slice(0, 50)?.map((item) => ({
            label: getClientLabel(item),
            value: item._id,
        }));
        setStratClients(StartingClients)

        // 🔥 Load the rest in parallel — does not block the client dropdown
        const [Location, Store, chartofAccount, sales, Disinvoice, yearRes] = await Promise.all([
            getDataFundtion("/Location"),
            getDataFundtion("/Store"),
            getDataFundtion("/chartofAccounts/Stage4"),
            getDataFundtion("/SaleInvoice/OnlyNumberWithouStatus"),
            getDataFundtion("/DistrbutorInvoice/getDisInvoiceNumber"),
            getDataFundtion("/Openinginventory/getAllYear"),
        ]);
        setchartofAccount(chartofAccount.data)
        setsales(sales)
        setDisSales(Disinvoice)
        setStoreForDrp(Store.data)

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
        } catch (error) {
            console.error("Error fetching Client Ledger data:", error)
        } finally {
            setIsDataLoading(false)
        }
    }
    //console.log(slectedStore)
    useEffect(() => {
        getProduct()
    }, [])
    const openPopupTab = async () => {
        if (isDataLoading) return

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
            marge: loginVendor.isDistributor ? true : false,
            Client: SelectedClient,
            AcName: Clients.find((item) => item._id == SelectedClient).CutomerName || Clients.find((item) => item._id == SelectedClient).DistrbutorName,
            AcCode: Clients.find((item) => item._id == SelectedClient).SalesFlowRef || Clients.find((item) => item._id == SelectedClient).OldCode,
            type: Clients.find((item) => item._id == SelectedClient).SalesFlowRef ? "CLient" : "Dsitributor",
            PrintedBy: `${loginVendor.firstname}`,
            sales: sales,
            DisSales: DisSales,
            chartofAccount: chartofAccount
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<ClientLedgerPopup data={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }

    const [showPopup, setShowPopup] = useState(false);
    const [value, setValue] = useState(1)

    return (
    <ReportPageLayout title="Client Ledger">
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
                    <div className="col-span-1 md:col-span-2">
                        <button
                            onClick={() => openPopupTab()}
                            disabled={isLoading || isDataLoading}
                            className={`pd-btn-save w-full ${(isLoading || isDataLoading) ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                        >
                            {(isLoading || isDataLoading) ? 'Processing...' : 'Submit'}
                        </button>
                    </div>
                </div>

            </div>
        </>
    </ReportPageLayout>
    )

};

export default ClientLedger;