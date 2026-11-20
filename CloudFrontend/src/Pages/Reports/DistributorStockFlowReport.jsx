// DistributorStockFlowReport.jsx
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../Components/Global/AppSelect.jsx'
import { getDataFundtion } from '../../Api/CRUDFunctions';
import { useSelector } from 'react-redux';
import DistributorStockFlowReportPopup from './DistributorStockFlowReportPopup';
import ReactDOM from 'react-dom/client';
import ReportPageLayout from '../../Components/Global/ReportPageLayout.jsx';

/** Distributor Stock Flow: dates before this are not allowed */
const MIN_REPORT_DATE = "2026-07-01";

const clampMinDate = (dateStr) => {
  if (!dateStr) return dateStr;
  return dateStr < MIN_REPORT_DATE ? MIN_REPORT_DATE : dateStr;
};

const DistributorStockFlowReport = ({
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
  const [isOpen,   SetisOpen,] = useState(true)
  const [qtyType, setQtyType,] = useState('Box')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState([])
  const [storeforDrp, setStoreForDrp] = useState([])
  const [selectedLocation, setSelectedLocation] = useState([])
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const [slectedStore, setSlectedStore] = useState('')
  const [Store, setStore] = useState('')
  const [damage, setDamage] = useState("")
  const [dataStatus, setDataStatus] = useState('')
  const [quickSelect, setQuickSelect] = useState('Custom')
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState('')
    const [selectedMonth, setSelectedMonth] = useState('')
  //console.log(location)
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
            setStartDate(clampMinDate(firstDay));
            setEndDate(clampMinDate(todayStr));
    } else if (value === "YearToDate") {
        const [start, end] = years.at(-1).label.split(" to ");
        setSelectedYear(years.at(-1).value)
        setStartDate(clampMinDate(start))
        setEndDate(clampMinDate(end))
    }
  }

  const handleYearChange = (year) => {
    setSelectedYear(year.value)
    const [start, end] = year.label.split(" to ");
    if (quickSelect === "YearToDate") {
        setStartDate(clampMinDate(start))
        setEndDate(clampMinDate(end))
    }
  }

    const handleMonthChange = (month) => {
        setSelectedMonth(month.value);
        const firstDay = `${currentYear}-${month.value}-01`;
        const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
        const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
        setStartDate(clampMinDate(firstDay));
        setEndDate(clampMinDate(lastDay));
    }

    const getProduct = async () => {

    const yearRes = await getDataFundtion("/Openinginventory/getAllYear")
    // Only FY ranges that start on/after 2026-07-01 (no 2025 year)
    const yearList = yearRes
      .filter((item) => String(item.DateStart || "") >= MIN_REPORT_DATE)
      .map((item) => ({
        label: `${item.DateStart} to ${item.DateEnd}`,
        value: item.DateStart.split('-')[0]
      }));
    setYears(yearList)

    const Location = await getDataFundtion("/Location")
    const Store = await getDataFundtion("/Store")
    setStoreForDrp(Store.data)
    setSlectedStore(loginVendor.Store)
    setSelectedLocation(loginVendor.Location)
    const allLocation = Location.data.map((item) => ({
      label: item.LocationName,
      value: item._id,
    }));

    //console.log(allLocation)
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
    const updatedStoreDrp = storeforDrp?.filter(item => values.includes(item.Location))
      .filter(store => userStore.includes(store._id))
      .map((st) => ({
        label: st.StoreName,
        value: st._id
      }))
    //console.log(updatedStoreDrp)
    setStore(updatedStoreDrp)


  }

  const openPopupTab = async () => {
    if (!startDate || !endDate) {
      return toast.error("Please select Date From and Date To");
    }
    if (startDate < MIN_REPORT_DATE || endDate < MIN_REPORT_DATE) {
      return toast.error(`Dates before ${MIN_REPORT_DATE} are not allowed`);
    }
    if (endDate < startDate) {
      return toast.error("Date To cannot be before Date From");
    }

    const safeStart = clampMinDate(startDate);
    const safeEnd = clampMinDate(endDate);

    const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
    if (!popup) return alert('Popup blocked');
    
    popup.document.title = 'Inventory Report';
    popup.document.body.innerHTML = `<div id="popup-root">
    InventoryPopup
    </div>`;
    const submitData = {
      qtyType: qtyType,
      startDate: safeStart,
      endDate: safeEnd,
      location: selectedLocation,
      store: slectedStore,
      damage: damage,
      status: dataStatus,
      allStore : storeforDrp,
      alllocation : location
    }
    //console.log(submitData)
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<DistributorStockFlowReportPopup data={submitData} value={value} />);
      }
    }, 100);
    
    setValue(2)
  }
  const [showPopup, setShowPopup] = useState(false);
const [value , setValue] = useState(1)
  return (
    <ReportPageLayout title="Distributor Stock Flow Report">
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
              min={MIN_REPORT_DATE}
              disabled={quickSelect !== "Custom"}
              onChange={(e) => setStartDate(clampMinDate(e.target.value))}
              className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== "Custom" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
            <p className="text-xs text-gray-500 mt-1">Min date: 01 Jul 2026</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Date To</label>
            <input
              type="date"
              value={endDate}
              min={startDate && startDate > MIN_REPORT_DATE ? startDate : MIN_REPORT_DATE}
              disabled={quickSelect !== "Custom"}
              onChange={(e) => setEndDate(clampMinDate(e.target.value))}
              className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== "Custom" ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div className="col-span-1 md:col-span-2">
            <label className="block text-sm font-medium">Location</label>
            <AppSelect
              options={location}
              onChange={(e) => setDrp(e)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Location"
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
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Store"
            />
          </div>

          

          <div className="col-span-1 md:col-span-2">
            <label className="pd-label">Select QTY Type:</label>
            <div className="flex flex-wrap gap-4">
              {["Box", "Unit", "Carton", "Three"].map((type) => (
                <label key={type} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="QtyType"
                    value={type}
                    checked={qtyType === type}
                    onChange={(e) => setQtyType(e.target.value)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm pd-text-body">{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2">
            <button
              onClick={()=> openPopupTab()}
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

export default DistributorStockFlowReport;