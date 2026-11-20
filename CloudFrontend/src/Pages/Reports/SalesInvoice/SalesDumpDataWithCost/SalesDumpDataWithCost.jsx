// SalesDumpDataWithCost.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import { useDispatch, useSelector } from 'react-redux';
import SalesDumpDataWithCostPopup from './SalesDumpDataWithCostPopup.jsx';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import { toast } from 'react-toastify';
import { fetchbrand } from '../../../../Redux/Reducers/BrandRecducer.js';
import { fetchCategory } from '../../../../Redux/Reducers/CategoryReducer.js';
import { fetchOrderBooker } from '../../../../Redux/Reducers/OrderBookerReducer.js';
import { fetchDistributorOrderBooker } from '../../../../Redux/Reducers/DistributorOrderBookerReducer.js';
import { fetchLocation } from '../../../../Redux/Reducers/LocationReducer.js';
import { fetchClient } from '../../../../Redux/Reducers/ClientReducer.js';
import { fetchDistributroReducers } from '../../../../Redux/Reducers/DistributroReducers.js';
import { fetchCity } from '../../../../Redux/Reducers/CityReducer.js';
import { fetchZsm } from '../../../../Redux/Reducers/ZsmReducer.js';
import { fetchZone } from '../../../../Redux/Reducers/ZoneReducer.js';
import { fetchRegion } from '../../../../Redux/Reducers/RegionReducer.js';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';

const SalesDumpDataWithCost = ({
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
    const dispatch = useDispatch()
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
    const [selectedSku, setSelectSku] = useState([])
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
    const [loading, setLoading] = useState(true)
    const [TotalOrderBooker, setTotalOrderBooker] = useState([])
    const [City, setCity] = useState([])
    const [Zsm, setZsm] = useState([])
    const [Zone, setZone] = useState([])
    const [Region, setRegion] = useState([])
    const [quickSelect, setQuickSelect] = useState('Custom')
    const [years, setYears] = useState([])
    const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
    const Brand1 = useSelector((state) => state.Brand.brand)
    const Category1 = useSelector((state) => state.Category.category)
    const MasterSku1 = useSelector((state) => state.MasterSku.MasterSku)
    const SkuOptions = useSelector((state) => state.Product.product)
    const Vendor1 = useSelector((state) => state.Vendor.state)
    const Distirbutor1 = useSelector((state) => state.DistributroReducers.DistributroReducers)
    const DistributorOrderBooker1 = useSelector((state) => state.DistributorOrderBooker.DistributorOrderBooker)
    const Location1 = useSelector((state) => state.Location.Location)
    const StoreOptions = useSelector((state) => state.Store.Store)
    const OrderBooker1 = useSelector((state) => state.OrderBooker.OrderBooker)
    const Zsm1 = useSelector((state) => state.Zsm.Zsm)
    const Zone1 = useSelector((state) => state.Zone.zone)
    const Region1 = useSelector((state) => state.Region.Region)

    const Customer1 = useSelector((state) => state.Client.client)
    
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

    const getProduct = async () => {
        setLoading(true)
        try {
        const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
        const yearList = yearRes.map((item) => ({
            label: `${item.DateStart} to ${item.DateEnd}`,
            value: item.DateStart.split('-')[0]
        }));
        setYears(yearList)
        const Location = Location1.length == 0 ? await getDataFundtion("/Location")  : { data: Location1 }
        const Store = StoreOptions.length == 0 ? await getDataFundtion("/Store") : { data: StoreOptions }
        const City = await getDataFundtion("/City") 
        const DistributorOrderBooker = await getDataFundtion("/DitriButorOrderBooker")

        const Sku = SkuOptions.length == 0 ? await getDataFundtion("/product") : { data: SkuOptions }
        const Customer = Customer1.length == 0 ? await getDataFundtion("/Customer/customerNameid") : { data: Customer1 }                    
        const Distirbutor = await getDataFundtion("/Distrbutor")  
        const OrderBooker = await getDataFundtion("/OrderBooker")
        const ZsmRes = await getDataFundtion("/Zsm")
        const ZoneRes = await getDataFundtion("/Zone")
        const RegionRes = await getDataFundtion("/Region")
        const Brand =  await getDataFundtion("/Brand") 
        const MasterSku = MasterSku1.length == 0 ? await getDataFundtion("/MasterSku") : { data: MasterSku1 }
        const Vendor = await getDataFundtion("/Vendor") 
        const Category = Category1.length == 0 ? await getDataFundtion("/Category") : { data: Category1 }
        console.log(DistributorOrderBooker.data)
        setBrand(Brand.data)
        
        setTotalBrand(Brand.data)
        setMastarSku(MasterSku.data)
        setVendor(Vendor.data)
        setCategory(Category.data)
        setTotalOrderBooker(DistributorOrderBooker.data)
        setCity(City.data)
        setOrderBooker(OrderBooker.data)
        setZsm(ZsmRes.data)
        setZone(ZoneRes.data)
        setRegion(RegionRes.data)
        setSkuOptions(Sku.data)
        setTotalSku(Sku.data)
        setCustomer(Customer.data.concat(Distirbutor))
        setStoreForDrp(Store.data)
        setSlectedStore(loginVendor.Store)
        dispatch(fetchbrand(Brand.data))
        dispatch(fetchCategory(Category.data))
        dispatch(fetchOrderBooker(OrderBooker.data))
        dispatch(fetchDistributorOrderBooker(DistributorOrderBooker.data))
        dispatch(fetchLocation(Location.data))
        dispatch(fetchClient(Customer.data))
        dispatch(fetchDistributroReducers(Distirbutor))
        dispatch(fetchZsm(ZsmRes.data))
        dispatch(fetchZone(ZoneRes.data))
        dispatch(fetchRegion(RegionRes.data))
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
            GRAM : item.GRAM,
            label2: item.ProductName,
            For: "Sku"
        }))

        setSkuDrp(SkuDrp)
        setTotalSku(SkuDrp)
        setLocation(allLocation)
        const MasterSkuDrp = MasterSku.data.map((item) => ({
            value: item._id,
            label: `${item.MasterSkuName} ${item.mastercode}`,
            mastercode: item.mastercode,
            For: "MasterSku",
            label2: item.MasterSkuName,
        }))
        setMastarSkuDrp(MasterSkuDrp)
        setselectedMastarSku(MasterSkuDrp)
        setTotalMastarSku(MasterSkuDrp)


        const CategoryDrp = Category.data.map((item) => ({
            value: item._id,
            label: `${item.CategoryName} ${item.mastercode}`,
            mastercode: item.mastercode,
            For: "Category",
            label2: item.CategoryName

        }))
        setCategoryDrp(CategoryDrp)
        setselectedCategory(CategoryDrp)
        setTotalCategory(CategoryDrp)

        const BrandDrp = Brand.data.map((item) => ({
            value: item._id,
            label: `${item.BrandName} ${item.mastercode}`,
            mastercode: item.mastercode,
            For: "Brand",
            label2: item.BrandName,
            MarketingExpence: item.MarketingExpence ?? item.MarketingExpense,
        }))
        setBrandDrp(BrandDrp)
        setselectedBrand(BrandDrp)
        setTotalBrand(BrandDrp)
        const VendorDrp = Vendor.data.map((item) => ({
            value: item._id,
            label: `${item.VendorName} ${item.code}`,
            mastercode: item.code,
            label2: item.VendorName,
            For: "Vendor"
        }))
        setVendorDrp(VendorDrp)
        setselectedVendor(VendorDrp)
        } catch (err) {
            //console.log(err)
        }
        setLoading(false)
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

        popup.document.title = 'Sales Dump Data With Cost';
        popup.document.body.innerHTML = `<div id="popup-root">
    SalesDumpDataWithCostPopup
    </div>`;
        const submitData = {
            qtyType: qtyType,
            startDate: startDate,
            endDate: endDate,
            location: selectedLocation,
            store: loginVendor.isDistributor == "true" ? "69589f74bed54ca7db54930c" : slectedStore,
            Customer: Customer,
            SkuOptions: skuOptions,
            OrderBooker: OrderBooker,
            TotalOrderBooker: TotalOrderBooker,
            City: City,
            Zsm: Zsm,
            Zone: Zone,
            Region: Region,
            loginVendor : loginVendor,
            Vendor: selectedVendor,
            Brand: selectedBrand.length !== 0 ? selectedBrand : TotalBrand,
            Category: selectedCategory.length !== 0 ? selectedCategory : TotalCategory,
            MastarSku: selectedMastarSku.length !== 0 ? selectedMastarSku : TotalMastarSku,
        }
        console.log(submitData)
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                root.render(<SalesDumpDataWithCostPopup data={submitData} value={value} />);
            }
        }, 100);

        setValue(2)
    }


    const sortByvendor = (options) => {

        const selectedValues = options.map((opt) => opt);
        setselectedVendor(selectedValues);

        if (options.length === 0) {
            // Reset all dropdowns to original full lists
            setselectedVendor(VendorDrp);
            setCategoryDrp(TotalCategory);
            setBrandDrp(TotalBrand);
            setMastarSkuDrp(TotalMastarSku);
            setSkuDrp(TotalSku); // <-- make sure you have this total too
            return;
        }

        const selectedMastercodes = options.map((opt) => opt.mastercode);

        const SortedCategory = TotalCategory.filter((item) =>
            selectedMastercodes.some((code) => item.mastercode.startsWith(code))
        );
        setCategoryDrp(SortedCategory);

        const SortedBrand = TotalBrand.filter((item) =>
            selectedMastercodes.some((code) => item.mastercode.startsWith(code))
        );
        setBrandDrp(SortedBrand);

        const SortedMastesku = TotalMastarSku.filter((item) =>
            selectedMastercodes.some((code) => item.mastercode.startsWith(code))
        );
        setMastarSkuDrp(SortedMastesku);

        const Sku = TotalSku.filter((item) =>
            selectedMastercodes.some((code) => item.mastercode.startsWith(code))
        );
        setSkuDrp(Sku);
    };


    const sortByCategory = (options) => {

        const selectedValues = options.map((opt) => opt);
        setselectedCategory(selectedValues); // ← not vendor

        if (options.length === 0) {
            const selectedMastercodes = selectedVendor.map((opt) => opt.mastercode);
            const SortedBrand = TotalBrand.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setBrandDrp(SortedBrand);
            const SortedMasterSku = TotalMastarSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setMastarSkuDrp(SortedMasterSku);
            const SortedSku = TotalSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setSkuDrp(SortedSku);
            return;
        }
        else {
            const selectedMastercodes = options.map((opt) => opt.mastercode);
            //console.log(selectedMastercodes)
            const SortedBrand = TotalBrand.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setBrandDrp(SortedBrand);

            const SortedMastesku = TotalMastarSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setMastarSkuDrp(SortedMastesku);

            const Sku = TotalSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setSkuDrp(Sku);
        }

    };
    const sortByBrand = (options) => {

        const selectedValues = options.map((opt) => opt);
        setselectedBrand(selectedValues); // ← not vendor
        if (options.length === 0) {
            const selectedMastercodes = selectedCategory.map((opt) => opt.mastercode);
            const SortedMasterSku = TotalMastarSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setMastarSkuDrp(SortedMasterSku);
            const SortedSku = TotalSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setSkuDrp(SortedSku);
            return;
        }
        else {
            const selectedMastercodes = options.map((opt) => opt.mastercode);
            const SortedMastesku = TotalMastarSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setMastarSkuDrp(SortedMastesku); const Sku = TotalSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setSkuDrp(Sku);
        }
    };
    const sortByMasterSku = (options) => {

        const selectedValues = options.map((opt) => opt);
        setselectedBrand(selectedValues); // ← not vendor
        if (options.length === 0) {
            const selectedMastercodes = selectedBrand.map((opt) => opt.mastercode);
            const SortedSku = TotalSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setSkuDrp(SortedSku);
            return;
        }
        else {
            const selectedMastercodes = options.map((opt) => opt.mastercode);
            const Sku = TotalSku.filter((item) =>
                selectedMastercodes.some((code) => item.mastercode.startsWith(code))
            );
            setSkuDrp(Sku);
        }
    };


    if (loading) {
        return <Loader />
    }

    return (
    <ReportPageLayout title="Sales Dump Data With Cost">
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
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">Vendor</label>
                        <AppSelect
                            isMulti
                            options={VendorDrp}
                            onChange={(options) => {
                                sortByvendor(options)
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Vendor"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">Category</label>
                        <AppSelect
                            isMulti
                            options={CategoryDrp}
                            onChange={(options) => {
                                sortByCategory(options)
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Category"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">Brand</label>
                        <AppSelect
                            isMulti
                            options={BrandDrp}
                            onChange={(options) => {
                                sortByBrand(options);
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Brand"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">MasterSku</label>
                        <AppSelect
                            isMulti
                            options={MastarSkuDrp}
                            onChange={(options) => {
                                sortByMasterSku(options);
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select MasterSku"
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium">Sku</label>
                        <AppSelect
                            isMulti
                            options={SkuDrp}
                            onChange={(options) => {
                                const selectedValues = options.map((opt) => opt.value);
                                setSelectSku(selectedValues);
                            }}
                            className="basic-single"
                            classNamePrefix="pd-select"
                            isSearchable
                            placeholder="Select Sku"
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

export default SalesDumpDataWithCost;
