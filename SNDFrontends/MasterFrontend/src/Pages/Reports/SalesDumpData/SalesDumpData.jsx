import AsyncSelect from 'react-select/async';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import React, { useEffect, useMemo, useState } from 'react';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import { useSelector } from 'react-redux';
import { ALL_DISTRIBUTORS, filterByAssignedDistributors, listFromResponse, reportDistributorIds } from '../../../Components/Global/distributorAccess';
import SalesDumpDataPopup from './SalesDumpDataPopup';
import ReactDOM from 'react-dom/client';

const ALL_OPTION = { value: ALL_DISTRIBUTORS, label: 'All Distributors' }
const ALL_CUSTOMER = { value: 'all', label: 'All Customers' }
const ALL_BOOKER = { value: 'all', label: 'All Order Bookers' }
const customerName = (item) => item.CustomorName || item.CutomerName || ''

const keepAllOrSpecific = (selected, allOption) => {
    const values = selected || []
    if (!values.length || values[values.length - 1]?.value === 'all') return [allOption]
    return values.filter((item) => item.value !== 'all')
}

const idString = (id) => {
    if (id && typeof id === "object") return String(id._id || id.id || "")
    return id == null ? "" : String(id)
}

const belongsToDistributors = (distributorId, ids) => {
    if (ids == null) return true
    const values = Array.isArray(distributorId) ? distributorId : [distributorId]
    return values.some((id) => ids.includes(idString(id)))
}

const SalesDumpData = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
    const [distributorOptions, setDistributorOptions] = useState([ALL_OPTION])
    const [selectedDistributors, setSelectedDistributors] = useState([ALL_OPTION])
    const [ProductDrp, setProductDrp] = useState([])
    const [selectedOrderBooker, setSelectedOrderBooker] = useState([ALL_BOOKER])
    const [selectedCustomer, setSelectedCustomer] = useState([ALL_CUSTOMER])
    const [selectedProduct, setSelectedProduct] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("Both")
    const [totalProducts, setTotalProducts] = useState([])
    const [totalCustomer, setTotalCustomer] = useState([])
    const [totalRegion, setTotalRegion] = useState([])
    const [totalCity, setTotalCity] = useState([])
    const [totalZone, setTotalZone] = useState([])
    const [totalOrderBooker, setTotalOrderBooker] = useState([])
    const [value, setValue] = useState(1)

    const mapCustomer = (item) => ({
        value: item._id,
        label: `${item.code || item.AccountCode || ''} ${customerName(item)}`.trim(),
        name: customerName(item),
        city: item.City,
        Zone: item.Zone,
        Region: item.Region,
        code: item.code,
        NTN: item.NTN,
        STN: item.STN,
        Address: item.Address,
        distributor: item.Distributor || item.Vendor || item.Distrbutor,
    })

    const getData = async () => {
        try {
            const distributorRes = await getDataFundtion('/Distrbutor')
            const assignedIds = reportDistributorIds(loginuser)
            const distributorList = listFromResponse(distributorRes).filter((item) =>
                assignedIds == null || assignedIds.includes(String(item._id))
            )
            setDistributorOptions([
                ALL_OPTION,
                ...distributorList.map((item) => ({
                    value: item._id,
                    label: `${item.DistrbutorSystemCode || ''} ${item.DistrbutorName}`.trim(),
                })),
            ])

            const OrderBookerRaw = await getDataFundtion("/orderbooker")
            const OrderBooker = {
                data: filterByAssignedDistributors(
                    listFromResponse(OrderBookerRaw),
                    loginuser,
                    (item) => item.Distributor || item.Distrbutor
                ),
            }

            const Region = await getDataFundtion("/Region").catch(() => [])
            setTotalRegion(listFromResponse(Region).map((item) => ({
                value: item._id,
                label: item.RegionName,
            })))
            const City = await getDataFundtion("/City").catch(() => [])
            setTotalCity(listFromResponse(City).map((item) => ({
                value: item._id,
                label: item.CityName,
            })))
            const Zone = await getDataFundtion("/Zone").catch(() => [])
            setTotalZone(listFromResponse(Zone).map((item) => ({
                value: item._id,
                label: item.ZoneName,
            })))

            const CustomerRaw = await getDataFundtion("/Customor")
            const Customer = {
                data: filterByAssignedDistributors(
                    listFromResponse(CustomerRaw),
                    loginuser,
                    (item) => item.Distributor || item.Vendor || item.Distrbutor
                ),
            }
            const customers = Customer.data.map(mapCustomer)
            setTotalCustomer(customers)

            const Product = await getDataFundtion("/product")
            const products = listFromResponse(Product).map((item) => ({
                value: item._id,
                label: `${item.code} ${item.ProductName}`,
                code: item.code,
                ProductName: item.ProductName,
            }))
            setProductDrp(products.slice(0, 50))
            setTotalProducts(products)
            setSelectedProduct(products)

            const bookers = OrderBooker.data.map((item) => ({
                value: item._id,
                label: item.OrderBookerName,
                distributor: item.Distributor || item.Distrbutor,
            }))
            setTotalOrderBooker(bookers)
        } catch (err) {
            console.log(err)
        }
    }

    const status = [
        { label: "Open", value: "Open" },
        { label: "Serviced", value: "Serviced" },
        { label: "Both", value: "Both" },
    ]

    const activeDistributorIds = useMemo(() => {
        const assigned = reportDistributorIds(loginuser)
        const pickedAll = !selectedDistributors.length || selectedDistributors.some((item) => item.value === ALL_DISTRIBUTORS)
        if (pickedAll) return assigned
        const picked = selectedDistributors.map((item) => String(item.value))
        if (assigned == null) return picked
        return picked.filter((id) => assigned.includes(id))
    }, [selectedDistributors, loginuser])

    const visibleCustomers = useMemo(
        () => totalCustomer.filter((item) => belongsToDistributors(item.distributor, activeDistributorIds)),
        [totalCustomer, activeDistributorIds]
    )
    const visibleBookers = useMemo(
        () => totalOrderBooker.filter((item) => belongsToDistributors(item.distributor, activeDistributorIds)),
        [totalOrderBooker, activeDistributorIds]
    )

    useEffect(() => {
        if (!loginuser || Array.isArray(loginuser) || !loginuser.email) return
        getData()
    }, [loginuser])

    useEffect(() => {
        setSelectedCustomer([ALL_CUSTOMER])
        setSelectedOrderBooker([ALL_BOOKER])
    }, [activeDistributorIds])

    const handleDistributorChange = (selected) => {
        const values = selected || []
        if (!values.length) {
            setSelectedDistributors([])
            return
        }
        const addedAll = values[values.length - 1]?.value === ALL_DISTRIBUTORS
        if (addedAll) {
            setSelectedDistributors([ALL_OPTION])
            return
        }
        setSelectedDistributors(values.filter((item) => item.value !== ALL_DISTRIBUTORS))
    }

    const loadProductOptions = async (inputValue) => {
        if (!inputValue) return []
        return totalProducts
            .filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()))
            .slice(0, 50)
    }

    const loadCustomerOptions = async (inputValue) => {
        const query = (inputValue || '').toLowerCase()
        const matches = visibleCustomers
            .filter((item) => !query || item.label.toLowerCase().includes(query))
            .slice(0, 50)
        if (!query || ALL_CUSTOMER.label.toLowerCase().includes(query)) {
            return [ALL_CUSTOMER, ...matches]
        }
        return matches
    }

    const openPopupTab = async () => {
        if (startDate === "" || endDate === "") {
            return toast.error("Please enter start & end date")
        }
        if (!selectedDistributors.length) {
            return toast.error("Please select distributor")
        }
        if (Array.isArray(activeDistributorIds) && !activeDistributorIds.length) {
            return toast.error("No distributor assigned")
        }
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50')
        if (!popup) return alert('Popup blocked')

        popup.document.title = 'Sales Dump Data'
        popup.document.body.innerHTML = `<div id="popup-root"></div>`
        const customerIsAll = selectedCustomer.some((item) => item.value === 'all')
        const bookerIsAll = selectedOrderBooker.some((item) => item.value === 'all')
        const submitData = {
            startDate,
            endDate,
            Customer: customerIsAll ? visibleCustomers : selectedCustomer,
            Region: totalRegion,
            Zone: totalZone,
            City: totalCity,
            Product: selectedProduct.length > 0 ? selectedProduct : totalProducts,
            OrderBooker: bookerIsAll ? visibleBookers : selectedOrderBooker,
            Status: Invoicestatus,
            allowedDistributorIds: activeDistributorIds,
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root')
            if (mountNode) {
                clearInterval(interval)
                const root = ReactDOM.createRoot(mountNode)
                root.render(<SalesDumpDataPopup filterData={submitData} value={value} />)
            }
        }, 100)

        setValue(2)
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
            <ToastContainer />
            <h2 className="text-xl font-bold mb-4 text-gray-800">Sales Dump Data</h2>
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
                    <label className="block text-sm font-medium">Distributor</label>
                    <Select
                        isMulti
                        value={selectedDistributors}
                        onChange={handleDistributorChange}
                        options={distributorOptions}
                        placeholder="Select Distributor(s)"
                        closeMenuOnSelect={false}
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: (base) => ({ ...base, zIndex: 9999 }) }}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Order Booker</label>
                    <Select
                        isMulti
                        value={selectedOrderBooker}
                        options={[ALL_BOOKER, ...visibleBookers]}
                        onChange={(options) => setSelectedOrderBooker(keepAllOrSpecific(options, ALL_BOOKER))}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Order Booker"
                        closeMenuOnSelect={false}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Products</label>
                    <AsyncSelect
                        isMulti
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        cacheOptions
                        onChange={(options) => setSelectedProduct(options || [])}
                        loadOptions={loadProductOptions}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Product"
                        defaultOptions={ProductDrp}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Customer</label>
                    <AsyncSelect
                        key={activeDistributorIds == null ? 'all-customers' : activeDistributorIds.join(',')}
                        isMulti
                        value={selectedCustomer}
                        menuPortalTarget={document.body}
                        styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                        onChange={(options) => setSelectedCustomer(keepAllOrSpecific(options, ALL_CUSTOMER))}
                        loadOptions={loadCustomerOptions}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Customer"
                        defaultOptions={[ALL_CUSTOMER, ...visibleCustomers.slice(0, 50)]}
                        closeMenuOnSelect={false}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Status</label>
                    <Select
                        options={status}
                        value={status.find((item) => item.value === Invoicestatus)}
                        onChange={(option) => setInvoicestatus(option?.value || "Both")}
                        className="basic-single"
                        classNamePrefix="select"
                        isSearchable
                        placeholder="Select Status"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <button
                        onClick={() => openPopupTab()}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SalesDumpData
