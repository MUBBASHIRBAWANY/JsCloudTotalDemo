// PeriodActivityReport.jsx
import React, { useEffect, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx'
import PeriodActivityReportPopup from './PeriodActivityReportPopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';

const PeriodActivityReport = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [selectedStage, setSelectedStage] = useState('Stage4')
  const [fromAccount, setFromAccount] = useState(null)
  const [toAccount, setToAccount] = useState(null)
  const [allAccounts, setAllAccounts] = useState([]);
  const [accountOptions, setAccountOptions] = useState([]);
  const [years, setYears] = useState([])
  const [selectedYear, setSelectedYear] = useState(null)

  const stageOptions = [
    { label: "Stage All", value: "StageAll", "Stage": "0" },
    { label: "Stage 1", value: "Stage1", "Stage": "1" },
    { label: "Stage 2", value: "Stage2", "Stage": "2" },
    { label: "Stage 3", value: "Stage3", "Stage": "3" },
    { label: "Stage 4", value: "Stage4", "Stage": "4" }
  ];

  const getData = async () => {
    setIsLoading(true)
    const [yearRes, accountsRes] = await Promise.all([
      getDataFundtion("/Openinginventory/getAllYear"),
      getDataFundtion(`/chartofAccounts`)
    ])
    const yearList = (yearRes || []).map((item) => ({
      label: `${item.DateStart} to ${item.DateEnd}`,
      value: item.DateStart.split('-')[0],
      start: item.DateStart,
      end: item.DateEnd
    }));
    // Latest year pehle aur by default selected
    yearList.sort((a, b) => b.value - a.value)
    setYears(yearList)
    if (yearList.length > 0) setSelectedYear(yearList[0])

    const accounts = accountsRes.data || accountsRes || [];
    setAllAccounts(accounts)
    setIsLoading(false)
  }

  // Stage change pe frontend pe filter
  useEffect(() => {
    const stageNum = stageOptions.find(s => s.value === selectedStage)?.Stage || '0';
    const filtered = stageNum === '0'
      ? allAccounts
      : allAccounts.filter(acc => String(acc.Stage) === stageNum);
    const options = filtered.map(acc => ({
      label: `${acc.AccountCode} - ${acc.AccountName}`,
      value: acc._id || acc.id,
      Stage: acc.Stage,
      code: acc.AccountCode
    }));
    setAccountOptions(options)
    setFromAccount(null)
    setToAccount(null)
  }, [selectedStage, allAccounts])

  // From Account change pe To Account automatically select ho jaye
  const handleFromAccountChange = (selected) => {
    setFromAccount(selected);
    setToAccount(selected);
  };

  const toAccountOptions = fromAccount
    ? accountOptions.filter((_, index) => {
      const fromIndex = accountOptions.findIndex(opt => opt.value === fromAccount.value);
      return index >= fromIndex;
    })
    : accountOptions;

  useEffect(() => {
    getData()
  }, [])

  const openPopupTab = async () => {
    if (!selectedYear) return alert('Please select a year');

    const popup = window.open('', '', 'width=1400,height=900,left=80,top=30');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Period Activity Report';
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
      stage: selectedStage,
      fromAccount: fromAccount?.code || '',
      toAccount: toAccount?.code || ''
    };
    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        const root = ReactDOM.createRoot(mountNode);
        root.render(<PeriodActivityReportPopup data={submitData} />);
      }
    }, 100);
  }
  const changeStage = (e) => {
    setSelectedStage(e.value)
  }
  return (
    <ReportPageLayout title="Period Activity Report">
      <>
        <div className="pd-card p-6 w-[90%] max-w-md mx-[30%] my-[5%]">

          <div className="grid grid-cols-5 md:grid-cols-2 gap-4">
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

            <div>
              <label className="block text-sm font-medium">Stage</label>
              <AppSelect
                options={stageOptions}
                value={stageOptions.find(opt => opt.value === selectedStage)}
                onChange={(e) => changeStage(e)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Stage..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium">From Account</label>
              <AppSelect
                options={accountOptions}
                value={fromAccount}
                onChange={(e) => handleFromAccountChange(e)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select From..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium">To Account</label>
              <AppSelect
                options={toAccountOptions}
                value={toAccount}
                onChange={(e) => setToAccount(e)}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select To..."
              />
            </div>

            <div className="col-span-1 md:col-span-2">
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

export default PeriodActivityReport;
