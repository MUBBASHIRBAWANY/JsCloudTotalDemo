// StockReportFlowReport.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import { getDataFundtion } from '../../Api/CurdFunctions';
import { useSelector } from 'react-redux';
import { ALL_DISTRIBUTORS, listFromResponse, reportDistributorIds } from '../../Components/Global/distributorAccess';
import StockFlowReportPopup from './StockFlowReportPopup';
import ReactDOM from 'react-dom/client';

const ALL_OPTION = { value: ALL_DISTRIBUTORS, label: 'All Distributors' }

const StockReportFlowReport = ({
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
    { label: "With Open", value: "With Open" },
    { label: "Serviced", value: "Serviced" },
  ];
  const [isOpen,   SetisOpen,] = useState(true)
  const [qtyType, setQtyType,] = useState('Box')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [location, setLocation] = useState([])
  const [storeforDrp, setStoreForDrp] = useState([])
  const [selectedLocation, setSelectedLocation] = useState([])
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail)
  const [distributorOptions, setDistributorOptions] = useState([ALL_OPTION])
  const [selectedDistributors, setSelectedDistributors] = useState([ALL_OPTION])
  const [slectedStore, setSlectedStore] = useState('')
  const [Store, setStore] = useState('')
  const [damage, setDamage] = useState("")
  const [dataStatus, setDataStatus] = useState('')
  console.log(location)
  const getProduct = async () => {

    const Location = await getDataFundtion("/Location")
    const Store = await getDataFundtion("/Store")
    setStoreForDrp(Store.data)
    setSlectedStore(loginVendor.Store)
    setSelectedLocation(loginVendor.Location)
    const allLocation = Location.data.map((item) => ({
      label: item.LocationName,
      value: item._id,
    }));

    console.log(allLocation)
    setLocation(allLocation)
  }
  useEffect(() => {
    getProduct()
  }, [])

  useEffect(() => {
    if (!loginVendor || Array.isArray(loginVendor) || !loginVendor.email) return
    const loadDistributors = async () => {
      try {
        const res = await getDataFundtion('/Distrbutor')
        const assignedIds = reportDistributorIds(loginVendor)
        const list = listFromResponse(res).filter((item) =>
          assignedIds == null || assignedIds.includes(String(item._id))
        )
        setDistributorOptions([
          ALL_OPTION,
          ...list.map((item) => ({
            value: item._id,
            label: `${item.DistrbutorSystemCode || ''} ${item.DistrbutorName}`.trim(),
          })),
        ])
      } catch (err) {
        console.log(err)
      }
    }
    loadDistributors()
  }, [loginVendor])

  const activeDistributorIds = useMemo(() => {
    const assigned = reportDistributorIds(loginVendor)
    const pickedAll = !selectedDistributors.length || selectedDistributors.some((item) => item.value === ALL_DISTRIBUTORS)
    if (pickedAll) return assigned
    const picked = selectedDistributors.map((item) => String(item.value))
    if (assigned == null) return picked
    return picked.filter((id) => assigned.includes(id))
  }, [selectedDistributors, loginVendor])

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
  const setDrp = (value) => {
    console.log(value)
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
    console.log(updatedStoreDrp)
    setStore(updatedStoreDrp)


  }

  const openPopupTab = async () => {
    if (startDate === '' || endDate === '') {
      return toast.error('Please enter start & end date')
    }
    if (!selectedDistributors.length) {
      return toast.error('Please select distributor')
    }
    if (Array.isArray(activeDistributorIds) && !activeDistributorIds.length) {
      return toast.error('No distributor assigned')
    }
    const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
    if (!popup) return alert('Popup blocked');
    
    popup.document.title = 'Inventory Report';
    popup.document.body.innerHTML = `<div id="popup-root">
    InventoryPopup
    </div>`;
    const submitData = {
      qtyType: qtyType,
      startDate: startDate,
      endDate: endDate,
      location: selectedLocation,
      store: slectedStore,
      damage: damage,
      status: dataStatus,
      allowedDistributorIds: activeDistributorIds,
    }
    console.log(submitData)
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<StockFlowReportPopup data={submitData} value={value} />);
      }
    }, 1000);
    
    setValue(2)
  }
  const [showPopup, setShowPopup] = useState(false);
const [value , setValue] = useState(1)
  return (
    <>
     <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
        <ToastContainer />
        <h2 className="text-xl font-bold mb-4 text-gray-800">Stock Flow Report</h2>
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
            <label className="block text-sm font-medium">Status</label>
            <Select
              options={status}
              onChange={(options) => setDataStatus(options.value)}
              className="basic-single"
              classNamePrefix="select"
              isSearchable
              placeholder="Select Status"
            />
          </div>

        

          <div className="col-span-1 md:col-span-2">
            <button
              onClick={()=> openPopupTab()}
              disabled={isLoading}
              className={`w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isLoading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </div>
        
      </div>
    </>
  )

};

export default StockReportFlowReport;