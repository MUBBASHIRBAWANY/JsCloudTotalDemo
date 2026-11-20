import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useSelector } from 'react-redux';
import Select from 'react-select';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CurdFunctions';
import {
  ALL_DISTRIBUTORS,
  listFromResponse,
  reportDistributorIds,
} from '../../../Components/Global/distributorAccess';
import SalesInvoiceSummaryPopup from './SalesInvoiceSummaryPopup';

const ALL_OPTION = { value: ALL_DISTRIBUTORS, label: 'All Stores' };

const SalesInvoiceSummary = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [value, setValue] = useState(1);
  const [distributorOptions, setDistributorOptions] = useState([]);
  const [selectedDistributors, setSelectedDistributors] = useState([ALL_OPTION]);

  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);

  useEffect(() => {
    const loadDistributors = async () => {
      try {
        const res = await getDataFundtion('/Distrbutor');
        const all = listFromResponse(res);
        const ids = reportDistributorIds(loginuser);
        const allowed = ids == null ? null : new Set(ids.map(String));
        const list = allowed == null ? all : all.filter((item) => allowed.has(String(item._id)));
        setDistributorOptions([
          ALL_OPTION,
          ...list.map((item) => ({
            value: item._id,
            label: `${item.DistrbutorSystemCode || ''} ${item.DistrbutorName}`.trim(),
          })),
        ]);
      } catch (err) {
        console.log(err);
        toast.error('Failed to load distributors');
      }
    };
    loadDistributors();
  }, [loginuser]);

  const handleDistributorChange = (selected) => {
    const values = selected || [];
    if (!values.length) {
      setSelectedDistributors([]);
      return;
    }
    const addedAll = values[values.length - 1]?.value === ALL_DISTRIBUTORS;
    if (addedAll) {
      setSelectedDistributors([ALL_OPTION]);
      return;
    }
    setSelectedDistributors(values.filter((item) => item.value !== ALL_DISTRIBUTORS));
  };

  const openPopupTab = async () => {
    if (startDate === '' || endDate === '') {
      return toast.error('Please enter start & end date');
    }
    if (!selectedDistributors.length) {
      return toast.error('Please select store');
    }

    const assignedIds = reportDistributorIds(loginuser);
    const selectedAll = selectedDistributors.some((item) => item.value === ALL_DISTRIBUTORS);
    const pickedIds = selectedDistributors
      .map((item) => item.value)
      .filter((id) => id !== ALL_DISTRIBUTORS);
    const scopedIds = assignedIds
      ? pickedIds.filter((id) => assignedIds.includes(String(id)))
      : pickedIds;
    const distributorParam = selectedAll
      ? (assignedIds ? assignedIds.join(',') : ALL_DISTRIBUTORS)
      : scopedIds.join(',');
    if (!distributorParam) {
      return toast.error('No store assigned');
    }

    const popup = window.open('', '', 'width=1400,height=800,left=80,top=40');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Sales Invoice Summary';
    popup.document.body.innerHTML = `<div id="popup-root"></div>`;

    const submitData = {
      startDate,
      endDate,
      Distributor: distributorParam,
      allowedDistributorIds: distributorParam === ALL_DISTRIBUTORS ? null : distributorParam.split(','),
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
