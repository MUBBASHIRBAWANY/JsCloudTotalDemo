import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { useDispatch } from 'react-redux';

import SundryDebtorBalancePopup from './SundryDebtorBalancePopup';
import ReactDOM from 'react-dom/client';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';



const SundryDebtorBalance = () => {
    
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()
    const [RegionDrp, setRegionDrp] = useState([])
    const [GroupDrp, setGroupDrp] = useState([])
    const [OrderBookerDrp, setOrderBookerDrp] = useState([])
    const [CityDrp, setCityDrp] = useState([])
    const [ZoneDrp, setZoneDrp] = useState([])
    const [CustomerDrp, setCustomerDrp] = useState([])
    const [selectedRegion, setSelectedRegion] = useState([])
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([])
    const [selectedCity, setSelectedCity] = useState([])
    const [selectedGroup, setSelectedGroup] = useState([])
    const [selectedZone, setSelectedZone] = useState([])
    const [selectedCustomer, setSelectedCustomer] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("true")
    const [defaultCustomer, setDefaultCustomer] = useState([])
    
    const [totalCustomer, setTotalCustomer] = useState([])
    
    const [totalRegion, setTotalRegion] = useState([])
    const [totalGroup, setTotalGroup] = useState([])
    
    const [totalCity, setTotalCity] = useState([])
    const [totalZone, setTotalZone] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
    const [OrderBookerRaw, setOrderBookerRaw] = useState([])
    const [ChartofAccounts, setChartofAccounts] = useState([])
    const [value, setValue] = useState(1)
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState('')
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

            const Region = await getDataFundtion("/Region")
            setRegionDrp(Region.data.map((item) => ({
                value: item._id,
                label: item.RegionName,
                Group: item.Group
            })))
            setTotalRegion(Region.data.map((item) => ({
                value: item._id,
                label: item.GroupName,
                Group: item.Group
            })))
            const Group = await getDataFundtion("/Group")
            setGroupDrp(Group.data.map((item) => ({
                value: item._id,
                label: item.GroupName,
                Zone: item.Zone
            })))
            setTotalGroup(Group.data.map((item) => ({
                value: item._id,
                label: item.GroupName,
                Zone: item.Zone
            })))
            const OrderBooker = await getDataFundtion("/DitriButorOrderBooker")
            setOrderBookerRaw(OrderBooker.data || [])
            setOrderBookerDrp(OrderBooker.data.map((item) => ({
                value: item._id,
                Region : item.Region,
                label: item.OrderBookerName
            })))
            const City = await getDataFundtion("/City")
            setCityDrp(City.data.map((item) => ({
                value: item._id,
                label: item.CityName
            })))
            setTotalCity(City.data.map((item) => ({
                value: item._id,
                label: item.CityName,
                Region : item.Region
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
            const Customer = await getDataFundtion("/Distrbutor")
            setCustomerDrp(Customer.map((item) => ({
                value: item._id,
                label: `${item.OldCode || ""} ${item.DistrbutorName}`,
                city: item.City,
                OrderBooker : item.OrderBooker, 
                Region: City.data?.find((city)=> city._id == item.City)?.Region,
                Group: Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group,
                Zone:  Group.data?.find((gr) => gr._id == Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group)?.Zone,
                code: item.code || "",
                distributorCode: item.DistrbutorSystemCode || "",
                name: item.DistrbutorName || "",
                oldCode: item.OldCode || "",
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })).slice(0, 50))


            setTotalCustomer(Customer.map((item) => ({
                value: item._id,
                label: `${item.OldCode || ""} ${item.DistrbutorName}`,
                city: item.City,
                OrderBooker : item.OrderBooker,
                Region: City.data?.find((city)=> city._id == item.City)?.Region,
                Group: Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group,
                Zone:  Group.data?.find((gr) => gr._id == Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group)?.Zone,
                code: item.code || "",
                distributorCode: item.DistrbutorSystemCode || "",
                name: item.DistrbutorName || "",
                oldCode: item.OldCode || "",
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))

            setSelectedCustomer(Customer.map((item) => ({
                value: item._id,
                label: `${item.OldCode || ""} ${item.DistrbutorName}`,
                city: item.City,
                OrderBooker : item.OrderBooker,
                Region: City.data?.find((city)=> city._id == item.City)?.Region,
                Group: Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group,
                Zone:  Group.data?.find((gr) => gr._id == Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group)?.Zone,
                code: item.code || "",
                distributorCode: item.DistrbutorSystemCode || "",
                name: item.DistrbutorName || "",
                oldCode: item.OldCode || "",
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address
            })))

            setDefaultCustomer(Customer.map((item) => ({
                value: item._id,
                label: `${item.OldCode || ""} ${item.DistrbutorName}`,
                city: item.City,
                OrderBooker : item.OrderBooker,
                Region: City.data?.find((city)=> city._id == item.City)?.Region,
                Group: Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group,
                Zone:  Group.data?.find((gr) => gr._id == Region.data?.find((region)=> region._id == City.data?.find((city)=> city._id == item.City)?.Region)?.Group)?.Zone,
                code: item.code || "",
                distributorCode: item.DistrbutorSystemCode || "",
                name: item.DistrbutorName || "",
                oldCode: item.OldCode || "",
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))

            setSelectedOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName,
                Region : item.Region
            })))
            setTotalOrderBooker(OrderBooker.data.map((item) => ({
                value: item._id,
                Region : item.Region,
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
        const submitData = {
            startDate: startDate,
            endDate: endDate,
            Customer: selectedCustomer.length > 0 ? selectedCustomer : defaultCustomer,
            Region: selectedRegion.length > 0 ? selectedRegion : totalRegion,
            Zone: selectedZone.length > 0 ? selectedZone : totalZone,
            City: selectedCity.length > 0 ? selectedCity : totalCity,
            Group : selectedGroup.length > 0 ? selectedGroup : totalGroup,
            OrderBooker: selectedOrderBooker.length > 0 ? selectedOrderBooker : totalOrderBooker,
            SelectedOrderBooker: selectedOrderBooker.length > 0 ? selectedOrderBooker : totalOrderBooker,
            SelectedCustomer: selectedCustomer.length > 0 ? selectedCustomer : defaultCustomer,
            SelectedRegion: selectedRegion.length > 0 ? selectedRegion : totalRegion,
            SelectedZone: selectedZone.length > 0 ? selectedZone : totalZone,
            SelectedCity: selectedCity.length > 0 ? selectedCity : totalCity,
            SelectedGroup: selectedGroup.length > 0 ? selectedGroup : totalGroup,
            ChartofAccounts: ChartofAccounts,
            OrderBookerRaw: OrderBookerRaw
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<SundryDebtorBalancePopup filterData={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }
    return (
        <ReportPageLayout title="Sundry Debtor Balance">
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

export default SundryDebtorBalance