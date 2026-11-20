import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { toast, ToastContainer } from 'react-toastify';
import AppSelect from '../../../../Components/Global/AppSelect.jsx';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import StoreWiseClientLedgerPopup from './StoreWiseClientLedgerPopup';

const quickSelectOptions = [
  { label: 'Custom', value: 'Custom' },
  { label: 'Year to Date', value: 'YearToDate' },
  { label: 'Month to Date', value: 'MonthToDate' },
];

const monthOptions = [
  { label: 'January', value: '01' },
  { label: 'February', value: '02' },
  { label: 'March', value: '03' },
  { label: 'April', value: '04' },
  { label: 'May', value: '05' },
  { label: 'June', value: '06' },
  { label: 'July', value: '07' },
  { label: 'August', value: '08' },
  { label: 'September', value: '09' },
  { label: 'October', value: '10' },
  { label: 'November', value: '11' },
  { label: 'December', value: '12' },
];

const StoreWiseClientLedger = ({ view = 'Detail' }) => {
  const title = view === 'Summary' ? 'Store Wise Client Ledger Summary' : 'Store Wise Client Ledger Detail';
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickSelect, setQuickSelect] = useState('Custom');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [storeRes, yearRes] = await Promise.all([
          getDataFundtion('/Store'),
          getDataFundtion('/Openinginventory/getAllYear'),
        ]);
        const storeRows = Array.isArray(storeRes) ? storeRes : (storeRes?.data || []);
        const yearRows = Array.isArray(yearRes) ? yearRes : (yearRes?.data || []);
        setStores(storeRows.map((item) => ({ value: item._id, label: item.StoreName })));
        setYears(yearRows.map((item) => ({
          label: `${item.DateStart} to ${item.DateEnd}`,
          value: String(item.DateStart || '').split('-')[0],
        })));
      } catch (error) {
        console.error(error);
        toast.error('Failed to load stores');
      }
    };
    load();
  }, []);

  const handleQuickSelect = (value) => {
    setQuickSelect(value);
    const today = new Date().toISOString().split('T')[0];
    if (value === 'MonthToDate') {
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      setSelectedMonth(month);
      setStartDate(`${currentYear}-${month}-01`);
      setEndDate(today);
    } else if (value === 'YearToDate') {
      if (!years.length) return toast.error('Year list is not loaded yet');
      const latest = years.at(-1);
      const [start, end] = latest.label.split(' to ');
      setSelectedYear(latest.value);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const openPopup = () => {
    if (!startDate || !endDate) return toast.error('Please enter start and end date');
    if (startDate > endDate) return toast.error('Start date cannot be after end date');
    if (!selectedStore?.value) return toast.error('Please select a store');

    const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
    if (!popup) return toast.error('Popup blocked');
    popup.document.title = title;
    [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach((node) => {
      popup.document.head.appendChild(node.cloneNode(true));
    });
    popup.document.body.innerHTML = '<div id="popup-root"></div>';
    popup.document.body.style.margin = '0';
    popup.document.body.style.background = '#fff';

    const filterData = {
      startDate,
      endDate,
      store: selectedStore.value,
      storeName: selectedStore.label,
      view,
    };
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (!mountNode) return;
      clearInterval(interval);
      ReactDOM.createRoot(mountNode).render(
        <StoreWiseClientLedgerPopup title={title} filterData={filterData} />
      );
    }, 100);
  };

  return (
    <ReportPageLayout title={title} subtitle="Customers of the selected store">
      <div className="pd-card p-6 w-[90%] max-w-xl mx-auto my-8">
        <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Quick Select</label>
            <AppSelect
              options={quickSelectOptions}
              value={quickSelectOptions.find((option) => option.value === quickSelect)}
              onChange={(option) => handleQuickSelect(option.value)}
              classNamePrefix="pd-select"
              placeholder="Select..."
            />
          </div>
          {quickSelect === 'YearToDate' ? (
            <div>
              <label className="block text-sm font-medium">Select Year</label>
              <AppSelect
                options={years}
                value={years.find((year) => year.value === selectedYear) || null}
                onChange={(year) => {
                  setSelectedYear(year.value);
                  const [start, end] = year.label.split(' to ');
                  setStartDate(start);
                  setEndDate(end);
                }}
                classNamePrefix="pd-select"
                placeholder="Select Year..."
              />
            </div>
          ) : null}
          {quickSelect === 'MonthToDate' ? (
            <div>
              <label className="block text-sm font-medium">Select Month</label>
              <AppSelect
                options={monthOptions}
                value={monthOptions.find((month) => month.value === selectedMonth) || null}
                onChange={(month) => {
                  setSelectedMonth(month.value);
                  const lastDay = new Date(currentYear, parseInt(month.value, 10), 0).getDate();
                  setStartDate(`${currentYear}-${month.value}-01`);
                  setEndDate(`${currentYear}-${month.value}-${String(lastDay).padStart(2, '0')}`);
                }}
                classNamePrefix="pd-select"
                placeholder="Select Month..."
              />
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium">Date From</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} disabled={quickSelect !== 'Custom'} className="w-full mt-1 p-2 border rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium">Date To</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} disabled={quickSelect !== 'Custom'} className="w-full mt-1 p-2 border rounded-md" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Store</label>
            <AppSelect
              options={stores}
              value={selectedStore}
              onChange={setSelectedStore}
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Store"
            />
          </div>
          <div className="md:col-span-2">
            <button type="button" onClick={openPopup} className="pd-btn-save w-full">Submit</button>
          </div>
        </div>
      </div>
    </ReportPageLayout>
  );
};

export default StoreWiseClientLedger;
