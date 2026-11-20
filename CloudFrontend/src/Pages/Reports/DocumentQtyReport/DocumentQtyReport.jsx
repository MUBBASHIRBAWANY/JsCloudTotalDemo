import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { toast, ToastContainer } from 'react-toastify';
import AppAsyncSelect from '../../../Components/Global/AppAsyncSelect.jsx';
import AppSelect from '../../../Components/Global/AppSelect.jsx';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import DocumentQtyReportPopup from './DocumentQtyReportPopup';
import { viewOptions } from './reportModel';

const unwrapList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

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

const dcDetailStatuses = [
  { label: 'All', value: 'All' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancel', value: 'Cancel' },
  { label: 'Invoiced', value: 'Invoiced' },
];

const dcSummaryStatuses = [
  { label: 'All', value: 'All' },
  { label: 'Delivered & Invoiced', value: 'DeliveredInvoiced' },
  { label: 'Cancel', value: 'Cancel' },
];

const statusOptionsFor = (kind, view) => (
  kind === 'dc'
    ? (view === 'Detail' ? dcDetailStatuses : dcSummaryStatuses)
    : [
      { label: 'All', value: 'All' },
      { label: 'Accept', value: 'Accept' },
      { label: 'Process', value: 'Process' },
      { label: 'Partially Delivered', value: 'Partially Delivered' },
      { label: 'Delivered', value: 'Delivered' },
      { label: 'Deliverd', value: 'Deliverd' },
      { label: 'Received', value: 'Received' },
      { label: 'Off', value: 'Off' },
      { label: 'Reject', value: 'Reject' },
      { label: 'cancelled', value: 'cancelled' },
    ]
);

const DocumentQtyReport = ({ config }) => {
  const currentYear = new Date().getFullYear();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quickSelect, setQuickSelect] = useState('Custom');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [view, setView] = useState('Detail');
  const [status, setStatus] = useState(config.kind === 'dc' ? 'Delivered' : 'All');
  const statusOptions = statusOptionsFor(config.kind, view);
  const [products, setProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [distributorOptions, setDistributorOptions] = useState([]);
  const [selectedDistributors, setSelectedDistributors] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState(null);
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);

  useEffect(() => {
    const loadLookups = async () => {
      try {
        const [yearRes, distributorRes, cityRes, storeRes, productRes] = await Promise.all([
          getDataFundtion('/Openinginventory/getAllYear'),
          getDataFundtion('/Distrbutor/DistrbutorNameId'),
          getDataFundtion('/City'),
          getDataFundtion('/Store'),
          getDataFundtion('/product/getProductNameId'),
        ]);

        const yearList = unwrapList(yearRes).map((item) => ({
          label: `${item.DateStart} to ${item.DateEnd}`,
          value: String(item.DateStart || '').split('-')[0],
        }));
        setYears(yearList);

        const cityRows = unwrapList(cityRes).map((item) => ({
          value: item._id,
          label: item.CityName,
        }));
        const cityName = new Map(cityRows.map((item) => [String(item.value), item.label]));
        setCities(cityRows);

        const distributorRows = unwrapList(distributorRes).map((item) => ({
          value: item._id,
          label: `${item.OldCode || item.DistrbutorSystemCode || ''} ${item.DistrbutorName || ''}`.trim(),
          name: item.DistrbutorName || '',
          cityId: item.City || '',
          city: cityName.get(String(item.City || '')) || '',
        }));
        setDistributors(distributorRows);
        setDistributorOptions(distributorRows.slice(0, 50));

        setStores(unwrapList(storeRes).map((item) => ({
          value: item._id,
          label: item.StoreName,
        })));

        const productRows = unwrapList(productRes).map((item) => ({
          value: item._id,
          label: `${item.salesFlowRef || ''} ${item.ProductName || ''}`.trim(),
          name: item.ProductName || '',
          sku: item.salesFlowRef || '',
          boxInCarton: item.BoxinCarton,
          tpSale: item.TPSale,
        }));
        setProducts(productRows);
        setProductOptions(productRows.slice(0, 50));
      } catch (err) {
        console.error(err);
        toast.error('Failed to load report filters');
      }
    };
    loadLookups();
  }, []);

  const handleQuickSelect = (value) => {
    setQuickSelect(value);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (value === 'MonthToDate') {
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(currentMonth);
      setStartDate(`${currentYear}-${currentMonth}-01`);
      setEndDate(todayStr);
    } else if (value === 'YearToDate') {
      if (!years.length) {
        toast.error('Year list is not loaded yet');
        return;
      }
      const latest = years.at(-1);
      const [start, end] = latest.label.split(' to ');
      setSelectedYear(latest.value);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleYearChange = (year) => {
    setSelectedYear(year.value);
    const [start, end] = year.label.split(' to ');
    if (quickSelect === 'YearToDate') {
      setStartDate(start);
      setEndDate(end);
    }
  };

  const handleMonthChange = (month) => {
    setSelectedMonth(month.value);
    const lastDayDate = new Date(currentYear, parseInt(month.value, 10), 0);
    setStartDate(`${currentYear}-${month.value}-01`);
    setEndDate(`${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`);
  };

  const loadFrom = (list) => async (inputValue) => {
    if (!inputValue) return list.slice(0, 50);
    return list
      .filter((item) => item.label.toLowerCase().includes(inputValue.toLowerCase()))
      .slice(0, 50);
  };

  const openPopup = () => {
    if (!startDate || !endDate) {
      toast.error('Please enter start & end date');
      return;
    }
    if (startDate > endDate) {
      toast.error('Start date cannot be after end date');
      return;
    }

    const popup = window.open('', '', 'width=1200,height=800,left=100,top=50');
    if (!popup) {
      toast.error('Popup blocked');
      return;
    }

    popup.document.title = config.title;
    [...document.querySelectorAll('link[rel="stylesheet"], style')].forEach((node) => {
      popup.document.head.appendChild(node.cloneNode(true));
    });
    popup.document.body.innerHTML = '<div id="popup-root"></div>';
    popup.document.body.style.margin = '0';
    popup.document.body.style.background = '#fff';

    const filterPayload = {
      startDate,
      endDate,
      view,
      status,
      products: selectedProducts,
      distributors: selectedDistributors,
      store: selectedStore,
      city: selectedCity,
      lookups: { products, distributors, stores },
    };

    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (!mountNode) return;
      clearInterval(interval);
      ReactDOM.createRoot(mountNode).render(
        <DocumentQtyReportPopup config={config} filterData={filterPayload} />
      );
    }, 100);
  };

  return (
    <ReportPageLayout title={config.title} subtitle="Summary, product summary, and detail">
      <div className="pd-card p-6 w-[90%] max-w-xl mx-auto my-8">
        <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Quick Select</label>
            <AppSelect
              options={quickSelectOptions}
              value={quickSelectOptions.find((option) => option.value === quickSelect)}
              onChange={(option) => handleQuickSelect(option.value)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select..."
            />
          </div>
          {quickSelect === 'YearToDate' ? (
            <div>
              <label className="block text-sm font-medium">Select Year</label>
              <AppSelect
                options={years}
                value={years.find((year) => year.value === selectedYear) || null}
                onChange={handleYearChange}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
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
                onChange={handleMonthChange}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Month..."
              />
            </div>
          ) : null}
          <div>
            <label className="block text-sm font-medium">Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              disabled={quickSelect !== 'Custom'}
              className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== 'Custom' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              disabled={quickSelect !== 'Custom'}
              className={`w-full mt-1 p-2 border rounded-md ${quickSelect !== 'Custom' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Products</label>
            <AppAsyncSelect
              isMulti
              cacheOptions
              value={selectedProducts}
              onChange={(options) => setSelectedProducts(options || [])}
              loadOptions={loadFrom(products)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              isDisabled={view === 'Summary'}
              placeholder="All products"
              defaultOptions={productOptions}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Distributor</label>
            <AppAsyncSelect
              isMulti
              cacheOptions
              value={selectedDistributors}
              onChange={(options) => setSelectedDistributors(options || [])}
              loadOptions={loadFrom(distributors)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="All distributors"
              defaultOptions={distributorOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">City</label>
            <AppSelect
              options={cities}
              value={selectedCity}
              onChange={(option) => setSelectedCity(option)}
              isClearable
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="All cities"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Store</label>
            <AppSelect
              options={stores}
              value={selectedStore}
              onChange={(option) => setSelectedStore(option)}
              isClearable
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="All stores"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Report Type</label>
            <AppSelect
              options={viewOptions}
              value={viewOptions.find((option) => option.value === view)}
              onChange={(option) => {
                const nextView = option?.value || 'Detail';
                setView(nextView);
                if (config.kind !== 'dc') return;
                if (status === 'All') return;
                if (nextView === 'Detail') {
                  if (status === 'DeliveredInvoiced') setStatus('Delivered');
                } else if (status !== 'Cancel') {
                  setStatus('DeliveredInvoiced');
                }
              }}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select report type"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Status</label>
            <AppSelect
              options={statusOptions}
              value={statusOptions.find((option) => option.value === status)}
              onChange={(option) => setStatus(option?.value || 'All')}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select status"
            />
          </div>
          <div className="md:col-span-2">
            <button type="button" onClick={openPopup} className="pd-btn-save w-full">
              Submit
            </button>
          </div>
        </div>
      </div>
    </ReportPageLayout>
  );
};

export default DocumentQtyReport;
