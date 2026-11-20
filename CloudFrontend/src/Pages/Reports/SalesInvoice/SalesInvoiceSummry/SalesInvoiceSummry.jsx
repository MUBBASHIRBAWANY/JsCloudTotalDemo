// SalesInvoiceSummry.jsx
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import SalesInvoiceSummryPopup from './SalesInvoiceSummryPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { set } from 'react-hook-form';
import CustomerSaleWiseSummry from './CustomerSaleWiseSummry';
import OrderBookerSaleWiseSummry from './OrderBookerSaleWiseSummry';
import ProductSaleWiseSummry from './ProductWiseSaleSummry';
import SalesInvoiceSummryWithOutCalPopup from './SalesInvoiceSummryWithOutCalPopup';
import ProductAndClinetWise from './ProductAndClinetWise';
import RegionWise from './RegionWise';
import CustomerWiseNew from './CustomerWiseNew';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';

const SalesInvoiceSummry = ({
    handleLocationChange,
    locationOptions,
    storeOptions,
    isLoading
}) => {
    const damageOption = [
        { label: "Fresh", value: "Fresh" },
        { label: "Damage", value: "Damage" },
        { label: "Both", value: "Both" }
    ];

    const status = [
        { label: "Post", value: "Post" },
        { label: "UnPost", value: "UnPost" },
        { label: "Both", value: "Both" }
    ];
    const [isOpen, SetisOpen,] = useState(true)
    const [qtyType, setQtyType,] = useState('Box')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [location, setLocation] = useState([])
    const [storeforDrp, setStoreForDrp] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const [skuOptions, setSkuOptions] = useState([])
    const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)

    const [slectedStore, setSlectedStore] = useState('')

    const [Store, setStore] = useState([])
    const [Customer, setCustomer] = useState([])
    const [OrderBooker, setOrderBooker] = useState([])
    const [City, setCity] = useState([])
    const [Region, setRegion] = useState([])
    const [Zone, setZone] = useState([])
    const [Zsm, setZsm] = useState([])
    const [selectedType, setSelectedType] = useState("Invoice");
    const [selectedZone, setSelectedZone] = useState([])
    const [selectedRegion, setSelectedRegion] = useState([])
    //console.log(selectedType, "selectedType")
    const [damage, setDamage] = useState("")
    const [dataStatus, setDataStatus] = useState('')
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const [isDataLoading, setIsDataLoading] = useState(true)

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

    //console.log(location)
    const getProduct = async () => {
        setIsDataLoading(true)
        try {
            const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
            const yearList = yearRes.map((item) => ({
                label: `${item.DateStart} to ${item.DateEnd}`,
                value: item.DateStart.split('-')[0]
            }));
            setYears(yearList)

            const Location = await getDataFundtion("/Location")
            const Store = await getDataFundtion("/Store")
            const City = await getDataFundtion("/City")
            const Region = await getDataFundtion("/Region")
            const ZoneRes = await getDataFundtion("/Zone")
            const ZsmRes = await getDataFundtion("/Zsm")
            const Sku = await getDataFundtion("/product/getProductNameId")
            const Customer = await getDataFundtion("/customer")
            const Distributor = await getDataFundtion("/Distrbutor")
            const OrderBooker = await getDataFundtion("/OrderBooker")
            const DistributorOrder = await getDataFundtion("/DitriButorOrderBooker")
            setOrderBooker((OrderBooker.data || []).concat(DistributorOrder.data || []))
            setCity(City.data)
            setRegion(Region.data)
            setZone(ZoneRes.data)
            setZsm(ZsmRes.data || [])
            setSkuOptions(Sku.data)
            const customerList = Array.isArray(Customer?.data) ? Customer.data : (Array.isArray(Customer) ? Customer : [])
            const distributorList = Array.isArray(Distributor?.data) ? Distributor.data : (Array.isArray(Distributor) ? Distributor : [])
            const totalCustomer = customerList.concat(distributorList)
            setCustomer(totalCustomer)
            setStoreForDrp(Store.data)
            const assignedStoreIds = (loginVendor?.Store || [])
                .map((id) => String(id?._id || id))
                .filter(Boolean)
            const allowedStoreRows = (Store.data || []).filter((st) =>
                assignedStoreIds.length === 0 || assignedStoreIds.includes(String(st._id))
            )
            setSlectedStore(assignedStoreIds.length ? allowedStoreRows.map((st) => st._id) : (loginVendor.Store || []))
            const updatedStoreDrp = allowedStoreRows
                .map((st) => ({
                    label: st.StoreName,
                    value: st._id
                }))
            //console.log(updatedStoreDrp)
            setStore(updatedStoreDrp)
            setSelectedLocation(loginVendor.Location)
            const allLocation = Location.data.map((item) => ({
                label: item.LocationName,
                value: item._id,
            }));

            //console.log(allLocation)
            setLocation(allLocation)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setIsDataLoading(false)
        }
    }
    useEffect(() => {
        getProduct()
    }, [setStore])
    const setDrp = (value) => {
        //console.log(value)
        setSelectedLocation(value.value)
        const values = value.value;
        setStore([]);
        const userStore = loginVendor.Store
        setSlectedStore(userStore)



    }

    const zoneOptions = (Zone || []).map((item) => ({
        value: String(item._id),
        label: item.ZoneName || "",
        regionId: item.Region ? String(item.Region) : "",
    }))
    const regionOptionsAll = (Region || []).map((item) => ({
        value: String(item._id),
        label: item.RegionName || "",
        zoneId: item.Zone ? String(item.Zone) : "",
    }))
    const regionsForZones = (zones) => {
        if (!zones.length) return regionOptionsAll
        const zoneIds = new Set(zones.map((zone) => String(zone.value)))
        const linkedRegionIds = new Set(
            zoneOptions
                .filter((zone) => zoneIds.has(String(zone.value)) && zone.regionId)
                .map((zone) => String(zone.regionId))
        )
        return regionOptionsAll.filter(
            (region) => zoneIds.has(String(region.zoneId)) || linkedRegionIds.has(String(region.value))
        )
    }
    const regionOptions = regionsForZones(selectedZone)
    const onSummaryZoneChange = (options) => {
        const zones = options || []
        setSelectedZone(zones)
        if (!zones.length) return
        const allowed = new Set(regionsForZones(zones).map((region) => String(region.value)))
        setSelectedRegion((current) => current.filter((region) => allowed.has(String(region.value))))
    }

    const openPopupTab = async () => {
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    InventoryPopup
    </div>`;
        const assignedStoreIds = (loginVendor?.Store || [])
            .map((id) => String(id?._id || id))
            .filter(Boolean)
        const pickedStoreIds = (Array.isArray(slectedStore) ? slectedStore : (slectedStore ? [slectedStore] : []))
            .map((id) => String(id?._id || id))
            .filter(Boolean)
        const allowedPick = pickedStoreIds.filter((id) => assignedStoreIds.includes(id))
        const storeForQuery = assignedStoreIds.length
            ? (allowedPick.length ? allowedPick : assignedStoreIds)
            : pickedStoreIds
        const submitData = {
            qtyType: qtyType,
            startDate: startDate,
            endDate: endDate,
            location: selectedLocation,
            store: loginVendor.isDistributor == "true" ? "69589f74bed54ca7db54930c" : storeForQuery,
            damage: damage,
            status: dataStatus,
            City: City,
            Region: Region,
            Zone: Zone,
            Zsm: Zsm,
            storeforDrp: storeforDrp,
            setlocation: location,
            Customer: Customer,
            SkuOptions: skuOptions,
            OrderBooker: OrderBooker,
            loginVendor: loginVendor,
            selectedZoneIds: selectedZone.map((zone) => String(zone.value)),
            selectedRegionIds: selectedRegion.map((region) => String(region.value)),
        }
        //console.log(submitData)
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                if (selectedType === "OrderBooker") {
                    root.render(<OrderBookerSaleWiseSummry data={submitData} value={value} />);
                } else if (selectedType === "Customer") {
                    root.render(<CustomerSaleWiseSummry data={submitData} value={value} />);
                } else if (selectedType === "CustomerWiseNew") {
                    root.render(<CustomerWiseNew data={submitData} />);
                } else if (selectedType === "Product") {
                    root.render(<ProductSaleWiseSummry data={submitData} value={value} />);
                } else if (selectedType === "Invoice") {
                    root.render(<SalesInvoiceSummryPopup data={submitData} value={value} />);

                }
                else if (selectedType === "InvoiceWithOutCalCulation") {
                    root.render(<SalesInvoiceSummryWithOutCalPopup data={submitData} value={value} />);

                }
                else if (selectedType === "ProductAndClinetWise") {
                    //console.log("ProductAndClinetWise")
                    root.render(<ProductAndClinetWise data={submitData} value={value} />);

                }
                else if (selectedType === "RegionWise") {
                    //console.log("RegionWise")
                    root.render(<RegionWise data={submitData} value={value} />);

                }

            }
        }, 100);

        setValue(2)
    }
    const [showPopup, setShowPopup] = useState(false);
    const [value, setValue] = useState(1)
    const isBoss = loginVendor?.isBoss === true || loginVendor?.isBoss === "true";
    if (!isBoss) {
        return <Navigate to="/unauthorized" />;
    }
    return (
        <ReportPageLayout title="Sales Invoice Summary">
        <>
            <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">

                {isDataLoading && (
                    <div className="flex items-center justify-center p-4 mb-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
                        <span className="text-sm text-blue-700">Loading data, please wait...</span>
                    </div>
                )}

                <div className={`grid grid-cols-5 md:grid-cols-2 gap-4 ${isDataLoading ? 'opacity-50 pointer-events-none' : ''}`}>
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
                            isMulti
                            options={Store}
                            onChange={(options) => {
                                const selectedValues = options.map((opt) => opt.value);
                                setSlectedStore(selectedValues);
                            }}
                            isDisabled={loginVendor.isDistributor === "true" ? true : false}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Store"
                        />
                    </div>
                    {selectedType === "CustomerWiseNew" && (
                        <>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium">Zone</label>
                                <AppSelect
                                    isMulti
                                    options={zoneOptions}
                                    value={selectedZone}
                                    onChange={onSummaryZoneChange}
                                    className="basic-single"
                                    classNamePrefix="pd-select"
                                    isSearchable
                                    placeholder="All Zones"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium">Region</label>
                                <AppSelect
                                    isMulti
                                    options={regionOptions}
                                    value={selectedRegion}
                                    onChange={(options) => setSelectedRegion(options || [])}
                                    className="basic-single"
                                    classNamePrefix="pd-select"
                                    isSearchable
                                    placeholder="All Regions"
                                />
                            </div>
                        </>
                    )}
                    <div className="flex flex-wrap gap-6 items-center p-3 pd-bg-muted rounded-lg shadow-sm">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="OrderBooker"
                                checked={selectedType === "OrderBooker"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Order Booker Wise</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="Customer"
                                checked={selectedType === "Customer"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Customer Wise</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="CustomerWiseNew"
                                checked={selectedType === "CustomerWiseNew"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Customer Wise New</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="Product"
                                checked={selectedType === "Product"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Product Wise</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="Invoice"
                                checked={selectedType === "Invoice"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Invoice Wise</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="InvoiceWithOutCalCulation"
                                checked={selectedType === "InvoiceWithOutCalCulation"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Invoice Wise With Out Calaculation</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="ProductAndClinetWise"
                                checked={selectedType === "ProductAndClinetWise"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Product And Clinet Wise</span>

                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="reportType"
                                value="RegionWise"
                                checked={selectedType === "RegionWise"}
                                onChange={(e) => setSelectedType(e.target.value)}
                            />
                            <span>Region And City Wise</span>

                        </label>
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

export default SalesInvoiceSummry;