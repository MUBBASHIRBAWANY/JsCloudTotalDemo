import AsyncSelect from 'react-select/async';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
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


    const getData = async () => {
        try {
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
            console.log(err)
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
        console.log(totalCustomer)
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
        <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
            <ToastContainer />
            <div className="grid grid-cols-5 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Date From</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium">Date To</label>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full mt-1 p-2 border rounded-md"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Region</label>
                    <Select
                        isMulti
                        options={RegionDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedRegion(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Region"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Order Booker</label>
                    <Select
                        isMulti
                        options={OrderBookerDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedOrderBooker(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Order Booker"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">City</label>
                    <Select
                        isMulti
                        options={CityDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedCity(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select City"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Zone</label>
                    <Select
                        isMulti
                        options={ZoneDrp}
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedZone(selectedValues);
                        }}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Zone"
                    />
                </div>
             
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Customer</label>
                    <AsyncSelect
                        isMulti
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedCustomer(selectedValues);
                        }}

                        loadOptions={loadCustomerOptions}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Customer"
                        defaultOptions={CustomerDrp}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Status</label>
                    <Select
                        options={status}
                        onChange={(options) => {
                            setInvoicestatus(options.value);
                        }}
                        defaultInputValue='Post'
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select City"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <button
                        onClick={() => openPopupTab()}
                        className={`w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition `}
                    >
                        Submit
                    </button>
                </div>
            </div>

        </div>
    )
}

export default SalesInvoiceDumpData