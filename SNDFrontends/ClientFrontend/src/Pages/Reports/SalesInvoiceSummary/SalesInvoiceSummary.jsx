import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import SalesInvoiceSummaryPopup from './SalesInvoiceSummaryPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import { assignedDistributorIds, listFromResponse } from '../../../Components/Global/distributorAccess';

const ALL_OPTION = { value: 'all', label: 'All Stores' };

const SalesInvoiceSummary = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [value, setValue] = useState(1);
  const [distributorOptions, setDistributorOptions] = useState([]);
  const [selectedDistributors, setSelectedDistributors] = useState([ALL_OPTION]);

  const loginVendor = useSelector(
    (state) => state.LoginerReducer.userDetail
  );

  useEffect(() => {
    const loadStores = async () => {
      try {
        const res = await getDataFundtion('/Distrbutor');
        const all = listFromResponse(res);
        const ids = assignedDistributorIds(loginVendor);
        const list = ids == null
          ? all
          : all.filter((item) => ids.includes(String(item._id)));
        setDistributorOptions([
          ALL_OPTION,
          ...list.map((item) => ({
            value: String(item._id),
            label: `${item.DistrbutorSystemCode || ''} ${item.DistrbutorName || ''}`.trim(),
          })),
        ]);
      } catch (err) {
        console.log(err);
        toast.error('Failed to load stores');
      }
    };
    loadStores();
  }, [loginVendor]);

  const handleDistributorChange = (selected) => {
    const values = selected || [];
    if (!values.length) {
      setSelectedDistributors([]);
      return;
    }
    const addedAll = values[values.length - 1]?.value === 'all';
    if (addedAll) {
      setSelectedDistributors([ALL_OPTION]);
      return;
    }
    setSelectedDistributors(values.filter((item) => item.value !== 'all'));
  };

  const openPopupTab = async () => {
    if (startDate === '' || endDate === '') {
      return toast.error('Please enter start & end date');
    }
    if (!selectedDistributors.length) {
      return toast.error('Please select store');
    }

    const assignedIds = assignedDistributorIds(loginVendor);
    const selectedAll = selectedDistributors.some((item) => item.value === 'all');
    const pickedIds = selectedDistributors
      .map((item) => String(item.value))
      .filter((id) => id !== 'all');
    const visibleIds = distributorOptions
      .map((item) => String(item.value))
      .filter((id) => id !== 'all');
    const scopedIds = assignedIds
      ? pickedIds.filter((id) => assignedIds.includes(id))
      : pickedIds;
    const distributorIds = selectedAll
      ? (assignedIds || visibleIds)
      : scopedIds;
    if (!distributorIds.length) {
      return toast.error('No store assigned');
    }

    const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Sales Invoice Summary';
    popup.document.body.innerHTML = `<div id="popup-root"></div>`;

    const submitData = {
      startDate,
      endDate,
      Distributor: distributorIds.join(','),
      allowedDistributorIds: distributorIds,
    };

    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<SalesInvoiceSummaryPopup filterData={submitData} value={value} />);
      }
    }, 100);

    setValue(2);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md mx-[30%] my-[5%]">
      <ToastContainer />
      <h2 className="text-xl font-bold mb-4 text-gray-800">Sales Invoice Summary</h2>
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
          <button
            onClick={() => openPopupTab()}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default SalesInvoiceSummary;
