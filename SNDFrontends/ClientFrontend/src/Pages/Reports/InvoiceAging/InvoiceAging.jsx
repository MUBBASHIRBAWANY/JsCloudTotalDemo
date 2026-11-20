import AsyncSelect from 'react-select/async';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import React, { useEffect, useState } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRegion } from '../../../Redux/Reducers/RegionReducer';
import { fetchOrderBooker } from '../../../Redux/Reducers/OrderBookerReducer';
import { fetchCity } from '../../../Redux/Reducers/CityReducer';
import { fetchZone } from '../../../Redux/Reducers/ZoneReducer';
import { fetchClient } from '../../../Redux/Reducers/ClientReducer';
import InvoiceAgingPopup from './InvoiceAgingPopup';
import ReactDOM from 'react-dom/client';
import { assignedDistributorIds, listFromResponse } from '../../../Components/Global/distributorAccess';

const ALL_OPTION = { value: 'all', label: 'All Stores' };


const InvoiceAging = () => {
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
    const [ChartofAccounts, setChartofAccounts] = useState([])
    const [value, setValue] = useState(1)
    const [loading, setLoading] = useState(true)
    const [currentDate, setCurrentDate] = useState('')
    const [distributorOptions, setDistributorOptions] = useState([])
    const [selectedDistributors, setSelectedDistributors] = useState([ALL_OPTION])
const loginVendor = useSelector(
        (state) => state.LoginerReducer.userDetail
    );
    const Loader = () => (
        <div className="flex items-center justify-center h-screen">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const getData = async () => {
        setLoading(true)
        try {
            const assignedIds = assignedDistributorIds(loginVendor)
            const distRes = await getDataFundtion('/Distrbutor')
            const allStores = listFromResponse(distRes)
            const stores = assignedIds == null
                ? allStores
                : allStores.filter((item) => assignedIds.includes(String(item._id)))
            const storeIds = stores.map((item) => String(item._id)).filter(Boolean)
            setDistributorOptions([
                ALL_OPTION,
                ...stores.map((item) => ({
                    value: String(item._id),
                    label: `${item.DistrbutorSystemCode || ''} ${item.DistrbutorName || ''}`.trim(),
                })),
            ])

            const bookerChunks = await Promise.all(storeIds.map(async (id) => {
                try {
                    const res = await getDataFundtion(`/orderbooker/OrderByvendor/${id}`)
                    return listFromResponse(res)
                } catch (err) {
                    console.log(err)
                    return []
                }
            }))
            const customerChunks = await Promise.all(storeIds.map(async (id) => {
                try {
                    const res = await getDataFundtion(`/Customor/AllCutomerByDis/${id}`)
                    return listFromResponse(res)
                } catch (err) {
                    console.log(err)
                    return []
                }
            }))
            const bookerRows = bookerChunks.flat()
            const customerRows = customerChunks.flat()
            const seenBooker = new Set()
            const seenCustomer = new Set()
            const OrderBooker = {
                data: bookerRows.filter((item) => {
                    const key = String(item._id)
                    if (seenBooker.has(key)) return false
                    seenBooker.add(key)
                    return true
                }),
            }
            const Customer = {
                data: customerRows.filter((item) => {
                    const key = String(item._id)
                    if (seenCustomer.has(key)) return false
                    seenCustomer.add(key)
                    return true
                }),
            }

            setOrderBookerDrp(OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName
            })))
            console.log(Customer.data)
            setCustomerDrp(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.CustomorName}`,
                name: item.CustomorName,
                
                Address: item.Address
            })).slice(0, 50))


            setTotalCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.CustomorName}`,
                name: item.CustomorName,
                
                Address: item.Address

            })))

            setSelectedCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.CustomorName}`,
                name: item.CustomorName,
                
                Address: item.Address
            })))

            setDefaultCustomer(Customer.data.map((item) => ({
                value: item._id,
                label: `${item.CustomorName}`,
                name: item.CustomorName,
                
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
            
        } catch (err) {
            console.log(err)
        }
        setLoading(false)

    }


    useEffect(() => {
        if (!loginVendor || Array.isArray(loginVendor) || !loginVendor._id) {
            setLoading(false)
            return
        }
        getData()
    }, [loginVendor])

    const handleDistributorChange = (selected) => {
        const values = selected || []
        if (!values.length) {
            setSelectedDistributors([])
            return
        }
        const addedAll = values[values.length - 1]?.value === 'all'
        if (addedAll) {
            setSelectedDistributors([ALL_OPTION])
            return
        }
        setSelectedDistributors(values.filter((item) => item.value !== 'all'))
    }



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

    if (loading) {
        return <Loader />
    }
    const openPopupTab = async () => {

        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        if (!selectedDistributors.length) {
            return toast.error("Please select store")
        }
        const assignedIds = assignedDistributorIds(loginVendor)
        const selectedAll = selectedDistributors.some((item) => item.value === 'all')
        const pickedIds = selectedDistributors
            .map((item) => String(item.value))
            .filter((id) => id !== 'all')
        const visibleIds = distributorOptions
            .map((item) => String(item.value))
            .filter((id) => id !== 'all')
        const distributorIds = selectedAll
            ? (assignedIds || visibleIds)
            : (assignedIds ? pickedIds.filter((id) => assignedIds.includes(id)) : pickedIds)
        if (!distributorIds.length) {
            return toast.error("No store assigned")
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
            OrderBooker: selectedOrderBooker.length > 0 ? selectedOrderBooker : totalOrderBooker,
            loginVendor : loginVendor._id,
            allowedDistributorIds: distributorIds,
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
                    <label className="block text-sm font-medium">Store</label>
                    <Select
                        isMulti
                        value={selectedDistributors}
                        onChange={handleDistributorChange}
                        options={distributorOptions}
                        placeholder="Select Store"
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
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

export default InvoiceAging