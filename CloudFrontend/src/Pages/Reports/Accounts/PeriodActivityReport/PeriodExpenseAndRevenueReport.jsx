// PeriodExpenseAndRevenueReport.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import PeriodExpenseAndRevenueReportPopup from './PeriodExpenseAndRevenueReportPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';

const PeriodExpenseAndRevenueReport = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)

  const getData = async () => {
    setIsLoading(true)
    const yearRes = await getDataFundtion("/Openinginventory/getAllYear");
    const yearList = (yearRes || []).map((item) => ({
      label: `${item.DateStart} to ${item.DateEnd}`,
      value: item.DateStart.split('-')[0],
      start: item.DateStart,
      end: item.DateEnd
    }));
    yearList.sort((a, b) => b.value - a.value)
    setYears(yearList)
    if (yearList.length > 0) setSelectedYear(yearList[0])
    setIsLoading(false)
  }

  useEffect(() => {
    getData()
  }, [])

  const openPopupTab = async () => {
    if (!selectedYear) return alert('Please select a year');

    const popup = window.open('', '', 'width=1400,height=900,left=80,top=30');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Period Expense And Revenue Report';
    popup.document.body.innerHTML = `
      <div id="popup-root"></div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        body { margin: 0; padding: 0; font-family: 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif; }
      </style>
    `;

    const submitData = {
      startDate: selectedYear.start,
      endDate: selectedYear.end,
      yearLabel: selectedYear.label,
    };
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<PeriodExpenseAndRevenueReportPopup data={submitData} />);
      }
    }, 100);
  }

  return (
    <ReportPageLayout title="Period Expense And Revenue Report">
      <>
        <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">

          <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Select Year</label>
              <AppSelect
                options={years}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Year..."
              />
            </div>

            <div className="flex items-end">
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

export default PeriodExpenseAndRevenueReport;
