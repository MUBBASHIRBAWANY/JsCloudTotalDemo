import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx'
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import AppSelect from '../../../Components/Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';


import ReactDOM from 'react-dom/client';
import RCReportPopup from './RCReportPopup';
import { set } from 'react-hook-form';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';




const RCReport = () => {
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const dispatch = useDispatch()
    const [showin, setShowin] = useState("Box")
    const [Department, setDepartment] = useState([])
    const [selectedLocation, setSelectedLocation] = useState([])
    const [SelectedDepartment, setSelectedDepartment] = useState([])
    const [totalStore, setTotalStore] = useState([])
    const [totalLocation, setTotalLocation] = useState([])
    const [Location, setLocation] = useState([])
    const [Summary, setSummary] = useState("Detail")
    const [Qty, setQty] = useState("Box")
    const [VendorDrp, setVendorDrp] = useState([])
    const [ProductDrp, setProductDrp] = useState([])
    const [selectedVendor, setSelectedVendor] = useState([])
    const [selectedProduct, setSelectedProduct] = useState([])
    const [Invoicestatus, setInvoicestatus] = useState("true")
    const [defaultVendor, setDefaultVendor] = useState([])
    const [totalProducts, setTotalProducts] = useState([])
    const [totalVendor, setTotalVendor] = useState([])

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

            const location = await getDataFundtion("/location")
            setTotalLocation(location.data.map((item) => ({
                value: item._id,
                label: item.LocationName
            })))
            const Department = await getDataFundtion("/Store")
            setTotalStore(Department.data.map((item) => ({
                value: item._id,
                label: item.StoreName
            })))

            const DepartmentOptions = Department.data.map((item) => ({
                value: item._id,
                label: item.StoreName
            }))
            setDepartment(DepartmentOptions)
            const LocationOptions = location.data.map((item) => ({
                value: item._id,
                label: item.LocationName
            }))
            setLocation(LocationOptions)

            const Vendor = await getDataFundtion("/Vendor")
            setVendorDrp(Vendor.data.map((item) => ({
                value: item._id,
                label: `${item.VendorName} ${item.salesFlowRef}`,
                name: item.VendorName,
            })).slice(0, 50))

            const Product = await getDataFundtion("/product")
            setProductDrp(Product.data.map((item) => ({
                value: item._id,
                label: `${item.salesFlowRef} ${item.ProductName}`,
                code: item.salesFlowRef,
                HSCODE: item.HSCODE,
                Gram: item.GRAM,
                PcsinBox: item.PcsinBox,
                BoxinCarton: item.BoxinCarton,
            })).slice(0, 50))
            setTotalProducts(Product.data.map((item) => ({
                value: item._id,
                label: `${item.salesFlowRef} ${item.ProductName}`,
                code: item.salesFlowRef,
                ProductName: item.ProductName,
                Gram: item.GRAM,
                HSCODE: item.HSCODE,
                PcsinBox : item.PcsinBox,
                BoxinCarton : item.BoxinCarton,
            })))
            setTotalVendor(Vendor.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.VendorName}`,
                name: item.VendorName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))

            setSelectedVendor(Vendor.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.VendorName}`,
                name: item.VendorName,
            })))

            setDefaultVendor(Vendor.data.map((item) => ({
                value: item._id,
                label: `${item.AccountCode} ${item.VendorName}`,
                name: item.VendorName,
                city: item.City,
                Zone: item.Zone,
                Region: item.Region,
                code: item.code,
                NTN: item.NTN,
                STN: item.STN,
                Address: item.Address

            })))
            setSelectedProduct(Product.data.map((item) => ({
                value: item._id,
                label: `${item.salesFlowRef} ${item.ProductName}`,
                code: item.salesFlowRef,
                ProductName: item.ProductName,
                Gram: item.GRAM,
                HSCODE: item.HSCODE,
                PcsinBox: item.PcsinBox,
                BoxinCarton: item.BoxinCarton,
            })))


        } catch (err) {
            //console.log(err)
        }

    }

    const status = [
        { label: "Post", value: "true" },
        { label: "UnPost", value: "false" },
        { label: "Both", value: "Both" }
    ];
    const SummaryOptions = [
        { label: "Detail", value: "Detail" },
        { label: "Product Summary", value: "ProductSummary" },
        { label: "Summary", value: "Summary" },
    ];
    const QtyInBox = [
        { label: "Box", value: "Box" },
        { label: "Carton", value: "Carton" },
    ];
    useEffect(() => {
        getData()
    }, [])


    const loadProductOptions = async (inputValue) => {
        if (!inputValue) return [];

        const filtered = totalProducts
            .filter((item) =>
                item.label.toLowerCase().includes(inputValue.toLowerCase())
            )
            .slice(0, 50); // limit to first 50 results

        return filtered
    };
    const loadVendorOptions = async (inputValue) => {
        //console.log(totalVendor)
        if (!inputValue) return [];

        const filtered = totalVendor
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
            Vendor: selectedVendor.length > 0 ? selectedVendor : defaultVendor,
            Product: selectedProduct.length > 0 ? selectedProduct : totalProducts,
            Status: "Both",
            Location: selectedLocation,
            Department: SelectedDepartment,
            totalStore: totalStore,
            totalLocation: totalLocation,
        }
        const interval = setInterval(() => {
            const mountNode = popup.document.getElementById('popup-root');
            if (mountNode) {
                clearInterval(interval);
                const root = ReactDOM.createRoot(mountNode);
                

                    root.render(<RCReportPopup filterData={submitData} value={value} />);

            }
        }, 100);

        setValue(2)
    }
    return (
        <ReportPageLayout title="RC Report">
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
                    <label className="block text-sm font-medium">Products</label>
                    <AppAsyncSelect
                        isMulti
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedProduct(selectedValues);
                        }}

                        loadOptions={loadProductOptions}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        isDisabled= {Summary == "Summary" ? true : false}
                        placeholder="Select Product"
                        defaultOptions={ProductDrp}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Vendor</label>
                    <AppAsyncSelect
                        isMulti
                        cacheOptions
                        onChange={(options) => {
                            const selectedValues = options.map((opt) => opt);
                            setSelectedVendor(selectedValues);
                        }}

                        loadOptions={loadVendorOptions}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Vendor"
                        defaultOptions={VendorDrp}
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Location</label>
                    <AppSelect
                        options={Location}
                        onChange={(options) => {
                            setSelectedLocation(options);
                        }}
                        isClearable={true}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Loctaion"
                    />
                </div>
                <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-medium">Department</label>
                    <AppSelect
                        options={Department}
                        onChange={(options) => {
                            setSelectedDepartment(options);
                        }}
                        isClearable={true}
                        className="basic-single"
                        classNamePrefix="pd-select"
                        isSearchable
                        placeholder="Select Department"
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

export default RCReport