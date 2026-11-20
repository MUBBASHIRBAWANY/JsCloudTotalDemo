// TransferInReport.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import { useSelector } from 'react-redux';
import TransferInReportPopup from './TransferInReportPopup.jsx';
import ReactDOM from 'react-dom/client';

import { toast } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions.jsx';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';



const TransferInReport = ({
    handleLocationChange,
    locationOptions,
    storeOptions,
    isLoading
}) => {
    

    
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
    //console.log(slectedStore)

    const [Store, setStore] = useState([])
    const [Customer, setCustomer] = useState([])
    const [OrderBooker, setOrderBooker] = useState([])
    const [Brand, setBrand] = useState([])
    const [MastarSku, setMastarSku] = useState([])
    const [Vendor, setVendor] = useState([])
    const [Category, setCategory] = useState([])
    const [selectedBrand, setselectedBrand] = useState([])
    const [selectedMastarSku, setselectedMastarSku] = useState([])
    const [selectedVendor, setselectedVendor] = useState([])
    const [selectedCategory, setselectedCategory] = useState([])
    const [selectedSku , setSelectSku] = useState([])
    const [BrandDrp, setBrandDrp] = useState([])
    const [MastarSkuDrp, setMastarSkuDrp] = useState([])
    const [VendorDrp, setVendorDrp] = useState([])
    const [CategoryDrp, setCategoryDrp] = useState([])
    const [SkuDrp, setSkuDrp] = useState([])
    const [TotalBrand, setTotalBrand] = useState([])
    const [TotalMastarSku, setTotalMastarSku] = useState([])
    const [TotalCategory, setTotalCategory] = useState([])
    const [TotalSku, setTotalSku] = useState([])
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

    const getProduct = async () => {

        const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
        const yearList = yearRes.map((item) => ({
            label: `${item.DateStart} to ${item.DateEnd}`,
            value: item.DateStart.split('-')[0]
        }));
        setYears(yearList)

        const Location = await getDataFundtion("/Location")
        const Store = await getDataFundtion("/Store")
        const Sku = await getDataFundtion("/product/getProductNameId")
        setSkuOptions(Sku.data)
        setTotalSku(Sku.data)
        setSlectedStore(loginVendor.Store)
        const updatedStoreDrp = Store.data
            .map((st) => ({
                label: st.StoreName,
                value: st._id
            }))
        setStore(updatedStoreDrp)
        setSelectedLocation(loginVendor.Location)
        const allLocation = Location.data.map((item) => ({
            label: item.LocationName,
            value: item._id,
        }));
        const SkuDrp = Sku.data.map((item) => ({
            value: item._id,
            label: `${item.ProductName} ${item.mastercode}`,
            mastercode: item.mastercode,
            label2 : item.ProductName,
            For: "Sku"
        }))

        setSkuDrp(SkuDrp)
        setTotalSku(SkuDrp)
        setLocation(allLocation)
        
    }
    useEffect(() => {
        getProduct()
    }, [])
    const setDrp = (value) => {
        //console.log(value)
        setSelectedLocation(value.value)
        const values = value.value;
        setStore([]);
        const userStore = loginVendor.Store
        setSlectedStore(userStore)



    }

    const openPopupTab = async () => {
        const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
        if (!popup) return alert('Popup blocked');

        popup.document.title = 'Inventory Report';
        popup.document.body.innerHTML = `<div id="popup-root">
    InventoryPopup
    </div>`;
        const submitData = {
            startDate: startDate,
            endDate: endDate,
            location: selectedLocation,
            store: slectedStore,
            SkuOptions: skuOptions,
        }
        //console.log(submitData)
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<TransferInReportPopup data={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }


    
    


    

    return (
    <ReportPageLayout title="Transfer In Report">
        <>
            <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">

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
                        <label className="block text-sm font-medium">Department</label>
                        <AppSelect
                            options={Store}
                            onChange={(options) => {
                                setSlectedStore(options.value)
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Store"
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

export default TransferInReport;