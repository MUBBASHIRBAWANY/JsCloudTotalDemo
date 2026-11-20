import React, { useEffect, useState } from 'react';
import AppSelect from '../../../Components/Global/AppSelect.jsx';
import { toast, ToastContainer } from 'react-toastify';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import ReportPageLayout from '../../../Components/Global/ReportPageLayout.jsx';
import VisitReportPopup from './VisitReportPopup.jsx';

const VisitReport = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [OrderderBooker, setOrderderBooker] = useState([]);
  const [selectedOrderBooker, setSelectedOrderBooker] = useState(null);
  const [value, setValue] = useState(1);

  const getProduct = async () => {
    try {
      const DitriButorOrderBooker = await getDataFundtion('/DitriButorOrderBooker');
      const allOrderBookers = DitriButorOrderBooker?.data || DitriButorOrderBooker || [];
      setOrderderBooker(
        allOrderBookers.map((item) => ({
          value: item._id,
          label: item.OrderBookerName,
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to load order bookers');
    }
  };

  useEffect(() => {
    getProduct();
  }, []);

  const openPopupTab = async () => {
    if (!startDate || !endDate) {
      return toast.error('Please enter start & end date');
    }
    if (!selectedOrderBooker?.value) {
      return toast.error('Please select Order Booker');
    }

    const popup = window.open('', '', 'width=1280,height=860,left=80,top=40');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Visit Report';
    popup.document.head.innerHTML = `
      <meta charset="utf-8" />
      <title>Visit Report</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/react-toastify@11.0.5/dist/ReactToastify.css" />
      <style>
        html, body { margin: 0; padding: 0; background: #f3f3f6; }
        .Toastify__toast-container { width: 320px !important; max-width: calc(100vw - 24px) !important; }
        .Toastify__toast {
          min-height: 48px !important;
          margin-bottom: 8px !important;
          border-radius: 10px !important;
          font-family: "Work Sans", "Segoe UI", sans-serif !important;
          font-size: 13px !important;
          box-shadow: 0 8px 24px rgba(26,28,30,0.16) !important;
        }
        .Toastify__toast-body { padding: 4px 0 !important; line-height: 1.35 !important; }
      </style>
    `;
    popup.document.body.innerHTML = `<div id="popup-root"></div>`;
    popup.document.body.style.margin = '0';

    const submitData = {
      startDate,
      endDate,
      selectedOrderBooker,
    };

    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<VisitReportPopup data={submitData} value={value} />);
      }
    }, 100);

    setValue((prev) => prev + 1);
  };

  return (
    <ReportPageLayout
      title="Visit Report"
      subtitle="Track order booker visits, sales orders, phone orders, and field photos"
    >
      <div className="pd-card p-6 w-full max-w-lg mx-auto my-8">
        <ToastContainer />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="pd-label">Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pd-input w-full mt-1"
            />
          </div>
          <div>
            <label className="pd-label">Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pd-input w-full mt-1"
            />
          </div>
          <div className="md:col-span-2">
            <label className="pd-label">Order Booker</label>
            <AppSelect
              options={OrderderBooker}
              value={selectedOrderBooker}
              onChange={(e) => setSelectedOrderBooker(e)}
              className="basic-single mt-1"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Order Booker"
            />
          </div>
          <div className="md:col-span-2 pt-1">
            <button type="button" onClick={openPopupTab} className="pd-btn-save w-full">
              Generate Visit Report
            </button>
          </div>
        </div>
      </div>
    </ReportPageLayout>
  );
};

export default VisitReport;
