import React, { useEffect, useState } from 'react';
import AppSelect from '../../../Components/Global/AppSelect.jsx';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import { useSelector } from 'react-redux';
import StockRecalculatePopup from './StockRecalculatePopup';
import ReactDOM from 'react-dom/client';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';

const StockRecalculate = ({
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

  const [qtyType, setQtyType] = useState('Box');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState([]);
  const [Store, setStore] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState([]);
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const [slectedStore, setSlectedStore] = useState('');
  const [storeforDrp, setStoreForDrp] = useState([]);
  const [damage, setDamage] = useState('Fresh');
  const [dataStatus, setDataStatus] = useState('Post');
  const [quickSelect, setQuickSelect] = useState('Custom');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [value, setValue] = useState(1);

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
    setQuickSelect(value);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (value === "MonthToDate") {
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(currentMonth);
      const firstDay = `${currentYear}-${currentMonth}-01`;
      setStartDate(firstDay);
      setEndDate(todayStr);
    } else if (value === "YearToDate") {
      const [start, end] = years.at(-1).label.split(" to ");
      setSelectedYear(years.at(-1).value);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year.value);
    const [start, end] = year.label.split(" to ");
    if (quickSelect === "YearToDate") {
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month.value);
    const firstDay = `${currentYear}-${month.value}-01`;
    const lastDayDate = new Date(currentYear, parseInt(month.value), 0);
    const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  const getProduct = async () => {
    const yearRes = await getDataFundtion("/Openinginventory/getAllYear");
    const yearList = yearRes.map((item) => ({
      label: `${item.DateStart} to ${item.DateEnd}`,
      value: item.DateStart.split('-')[0]
    }));
    setYears(yearList);

    const Location = await getDataFundtion("/Location");
    const StoreData = await getDataFundtion("/Store");
    setStoreForDrp(StoreData.data);
    setSlectedStore(loginVendor.Store);
    setSelectedLocation(loginVendor.Location);
    const allLocation = Location.data.map((item) => ({
      label: item.LocationName,
      value: item._id,
    }));
    setLocation(allLocation);
  };

  useEffect(() => {
    getProduct();
  }, []);

  const setDrp = (value) => {
    setSelectedLocation(value.value);
    const values = value.value;
    const userStore = loginVendor.Store;
    setSlectedStore(userStore);
    const updatedStoreDrp = storeforDrp?.filter(item => values.includes(item.Location))
      .filter(store => userStore.includes(store._id))
      .map((st) => ({
        label: st.StoreName,
        value: st._id
      }));
    setStore(updatedStoreDrp);
  };

  const openPopupTab = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    const popup = window.open('', '', 'width=1400,height=800,left=50,top=50');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Stock Recalculate';
    popup.document.body.innerHTML = `<div id="popup-root">Loading...</div>`;

    const submitData = {
      qtyType: qtyType,
      startDate: startDate,
      endDate: endDate,
      location: selectedLocation,
      store: slectedStore,
      damage: damage,
      status: dataStatus,
      allStore: storeforDrp,
      alllocation: location
    };

    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<StockRecalculatePopup data={submitData} />);
      }
    }, 100);

    setValue(2);
  };

  return (
    <ReportPageLayout title="Stock Recalculate">
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
              <label className="block text-sm font-medium">Damage</label>
              <AppSelect
                options={damageOption}
                value={damageOption.find(opt => opt.value === damage)}
                onChange={(e) => setDamage(e.value)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select..."
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium">Status</label>
              <AppSelect
                options={status}
                value={status.find(opt => opt.value === dataStatus)}
                onChange={(e) => setDataStatus(e.value)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select..."
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <button
                onClick={() => openPopupTab()}
                disabled={isLoading}
                className={`pd-btn-save w-full ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoading ? 'Processing...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </>
    </ReportPageLayout>
  );
};

export default StockRecalculate;
