import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import { useDispatch } from 'react-redux';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';
import { fetchOrderBooker } from '../../../Redux/Reducers/OrderBookerReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import SalesInvoiceDumpDataPopup from './SalesInvoiceDumpDataPopup';
import ReactDOM from 'react-dom/client';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';



const SalesInvoiceDumpData = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()
    const [RegionDrp, setRegionDrp] = useState([])
    const [OrderBookerDrp, setOrderBookerDrp] = useState([])
    const [CityDrp, setCityDrp] = useState([])
    const [ZoneDrp, setZoneDrp] = useState([])
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [selectedRegion, setSelectedRegion] = useState([])
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([])
    const [selectedCity, setSelectedCity] = useState([])
    const [selectedZone, setSelectedZone] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("true")
    const [defaultCustomer, setDefaultCustomer] = useState([])
    const [totalCustomer, setTotalCustomer] = useState([])
    const [totalRegion, setTotalRegion] = useState([])
    const [totalCity, setTotalCity] = useState([])
    const [totalZone, setTotalZone] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
    const [ChartofAccounts, setChartofAccounts ] = useState([])
    const [value, setValue] = useState(1)
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

    const getData = async () => {
        try {
            const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
            const yearList = yearRes.map((item) => ({
                label: `${item.DateStart} to ${item.DateEnd}`,
                value: item.DateStart.split('-')[0]
            }));
            setYears(yearList)
            const Region = await getDataFundtion("/Region")
            setRegionDrp(Region.data.map((item) => ({
                value: item._id,
                label: item.RegionName
            })))
            setTotalRegion(Region.data.map((item) => ({
                value: item._id,
                label: item.RegionName
            })))
            const OrderBooker = await getDataFundtion("/orderbooker")
            setOrderBookerDrp(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            const City = await getDataFundtion("/City")
            setCityDrp(City.data.map((item) => ({
                value: item._id,
                label: item.CityName
            })))
            setTotalCity(City.data.map((item) => ({
                value: item._id,
                label: item.CityName
            })))
            const Zone = await getDataFundtion("/Zone")
            setZoneDrp(Zone.data.map((item) => ({
                value: item._id,
                label: item.ZoneName
            })))
            setTotalZone(Zone.data.map((item) => ({
                value: item._id,
                label: item.ZoneName
            })))
            const Customer = await getDataFundtion("/Customor")
            setCustomerDrp(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.CutomerName}`,
                name: item.CutomerName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })).slice(0, 50))

            
            setTotalCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.CutomerName}`,
                name: item.CutomerName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))

            setSelectedCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.CutomerName}`,
                name: item.CutomerName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })))

            setDefaultCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.CutomerName}`,
                name: item.CutomerName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))
            
            setSelectedOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            setTotalOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            setSelectedRegion(Region.data.map((item) => ({
                value: item._id,
                label: item.RegionName
            })))
            setSelectedCity(City.data.map((item) => ({
                value: item._id,
                label: item.CityName
            })))
            setSelectedZone(Zone.data.map((item) => ({
                value: item._id,
                label: item.ZoneName
            })))
            const accounts = await getDataFundtion("/ChartofAccounts")
            setChartofAccounts(accounts.data)
        } catch (err) {
            //console.log(err)
        }

    }

    const status = [
        { label: "Post", value: "true" },
        { label: "UnPost", value: "false" },
        { label: "Both", value: "Both" }
    ];

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
            Customer: selectedCustomer.length > 0 ? selectedCustomer : defaultCustomer,
            Region: selectedRegion.length > 0 ? selectedRegion : totalRegion,
            Zone: selectedZone.length > 0 ? selectedZone : totalZone,
            City: selectedCity.length > 0 ? selectedCity : totalCity,
            OrderBooker: selectedOrderBooker.length > 0 ? selectedOrderBooker : totalOrderBooker,
            Status: Invoicestatus,
            ChartofAccounts : ChartofAccounts
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<SalesInvoiceDumpDataPopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    return (
        <ReportPageLayout title="Sales Invoice Dump Data">
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
                    <label className="block text-sm font-medium">Region</label>
                    <AppSelect
                        isMulti
                        options={RegionDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedRegion(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Region"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Order Booker</label>
                    <AppSelect
                        isMulti
                        options={OrderBookerDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedOrderBooker(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Order Booker"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">City</label>
                    <AppSelect
                        isMulti
                        options={CityDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedCity(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select City"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Zone</label>
                    <AppSelect
                        isMulti
                        options={ZoneDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedZone(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Zone"
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
                    <label className="block text-sm font-medium">Status</label>
                    <AppSelect
                        options={status}
                        onChange={(options) => {
                            setInvoicestatus(options.value);
                        }}
                        defaultInputValue='Post'
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select City"
                    />
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

export default SalesInvoiceDumpData