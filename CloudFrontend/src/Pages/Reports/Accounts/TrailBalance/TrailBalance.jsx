import React, { useEffect, useMemo, useState } from 'react';
import AppSelect from '../../../../Components/Global/AppSelect.jsx';
import TrailBalancePopup from './TrailBalancePopup';
import ReactDOM from 'react-dom/client';
import { getDataFundtion } from '../../../../Api/CRUDFunctions';
import ReportPageLayout from '../../../../Components/Global/ReportPageLayout.jsx';

const stageOptions = [
  { label: 'Stage All', value: 'StageAll', Stage: '0' },
  { label: 'Stage 1', value: 'Stage1', Stage: '1' },
  { label: 'Stage 2', value: 'Stage2', Stage: '2' },
  { label: 'Stage 3', value: 'Stage3', Stage: '3' },
  { label: 'Stage 4', value: 'Stage4', Stage: '4' },
];

const quickSelectOptions = [
  { label: 'Custom', value: 'Custom' },
  { label: 'Year to Date', value: 'YearToDate' },
  { label: 'Month to Date', value: 'MonthToDate' },
];

const balanceModeOptions = [
  { label: 'Full Trial Balance (Opening + Period)', value: 'full' },
  { label: 'Opening Only (No Day Transactions)', value: 'opening' },
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

const TrailBalances = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState('Stage4');
  const [fromAccount, setFromAccount] = useState(null);
  const [toAccount, setToAccount] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [quickSelect, setQuickSelect] = useState('Custom');
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [balanceMode, setBalanceMode] = useState('full');

  const currentYear = new Date().getFullYear();

  const accountOptions = useMemo(() => {
    const stageNum = stageOptions.find((s) => s.value === selectedStage)?.Stage || '0';
    const filtered = stageNum === '0'
      ? allAccounts
      : allAccounts.filter((acc) => String(acc.Stage) === stageNum);
    return filtered.map((acc) => ({
      label: `${acc.AccountCode} - ${acc.AccountName}`,
      value: acc._id || acc.id,
      Stage: acc.Stage,
      code: acc.AccountCode,
    }));
  }, [selectedStage, allAccounts]);

  const toAccountOptions = useMemo(() => {
    if (!fromAccount) return accountOptions;
    const fromIndex = accountOptions.findIndex((opt) => opt.value === fromAccount.value);
    if (fromIndex < 0) return accountOptions;
    return accountOptions.filter((_, index) => index >= fromIndex);
  }, [accountOptions, fromAccount]);

  const handleQuickSelect = (value) => {
    setQuickSelect(value);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    if (value === 'MonthToDate') {
      const currentMonth = String(today.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(currentMonth);
      setStartDate(`${currentYear}-${currentMonth}-01`);
      setEndDate(todayStr);
    } else if (value === 'YearToDate' && years.length) {
      const last = years[years.length - 1];
      const [start, end] = last.label.split(' to ');
      setSelectedYear(last.value);
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
    const firstDay = `${currentYear}-${month.value}-01`;
    const lastDayDate = new Date(currentYear, parseInt(month.value, 10), 0);
    const lastDay = `${currentYear}-${month.value}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    setStartDate(firstDay);
    setEndDate(lastDay);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [yearRes, accountsRes] = await Promise.all([
          getDataFundtion('/Openinginventory/getAllYear'),
          getDataFundtion('/chartofAccounts'),
        ]);
        const yearList = (yearRes || []).map((item) => ({
          label: `${item.DateStart} to ${item.DateEnd}`,
          value: item.DateStart.split('-')[0],
        }));
        setYears(yearList);
        setAllAccounts(accountsRes?.data || accountsRes || []);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    setFromAccount(null);
    setToAccount(null);
  }, [selectedStage]);

  const openPopupTab = () => {
    if (!startDate || !endDate) {
      alert('Please select Date From and Date To');
      return;
    }

    const popup = window.open('', '', 'width=1280,height=860,left=80,top=40');
    if (!popup) return alert('Popup blocked');

    popup.document.title = 'Trial Balance Report';
    popup.document.body.innerHTML = `
      <div id="popup-root"></div>
      <style>
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        body { margin: 0; padding: 0; background: #f4f6f8; font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
      </style>
    `;

    const submitData = {
      startDate,
      endDate,
      stage: selectedStage,
      fromAccount: fromAccount?.code || '',
      toAccount: toAccount?.code || '',
      openingOnly: balanceMode === 'opening',
      balanceMode,
    };

    const interval = setInterval(() => {
      const mountNode = popup.document.getElementById('popup-root');
      if (mountNode) {
        clearInterval(interval);
        ReactDOM.createRoot(mountNode).render(<TrailBalancePopup data={submitData} />);
      }
    }, 80);
  };

  return (
    <ReportPageLayout title="Trial Balance">
      <div className="pd-card p-6 w-[92%] max-w-3xl mx-auto my-8">
        <div className="mb-5">
          <h2 className="text-lg font-semibold pd-text-body">Report Criteria</h2>
          <p className="text-sm pd-text-muted mt-1">
            Stage-3 groups with subtotals. Use Opening Only for day opening without period transactions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Balance Mode</label>
            <AppSelect
              options={balanceModeOptions}
              value={balanceModeOptions.find((opt) => opt.value === balanceMode)}
              onChange={(e) => setBalanceMode(e.value)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Stage</label>
            <AppSelect
              options={stageOptions}
              value={stageOptions.find((opt) => opt.value === selectedStage)}
              onChange={(e) => setSelectedStage(e.value)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select Stage..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quick Select</label>
            <AppSelect
              options={quickSelectOptions}
              value={quickSelectOptions.find((opt) => opt.value === quickSelect)}
              onChange={(e) => handleQuickSelect(e.value)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable={false}
            />
          </div>

          {quickSelect === 'YearToDate' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Year</label>
              <AppSelect
                options={years}
                value={years.find((y) => y.value === selectedYear) || null}
                onChange={handleYearChange}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Year..."
              />
            </div>
          )}

          {quickSelect === 'MonthToDate' && (
            <div>
              <label className="block text-sm font-medium mb-1">Select Month</label>
              <AppSelect
                options={monthOptions}
                value={monthOptions.find((m) => m.value === selectedMonth) || null}
                onChange={handleMonthChange}
                className="basic-single"
                classNamePrefix="pd-select"
                isSearchable
                placeholder="Select Month..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Date From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={quickSelect !== 'Custom'}
              className={`w-full p-2 border rounded-md ${quickSelect !== 'Custom' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Date To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={quickSelect !== 'Custom'}
              className={`w-full p-2 border rounded-md ${quickSelect !== 'Custom' ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">From Account</label>
            <AppSelect
              options={accountOptions}
              value={fromAccount}
              onChange={(e) => {
                setFromAccount(e);
                setToAccount(e);
              }}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select From..."
              isClearable
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">To Account</label>
            <AppSelect
              options={toAccountOptions}
              value={toAccount}
              onChange={(e) => setToAccount(e)}
              className="basic-single"
              classNamePrefix="pd-select"
              isSearchable
              placeholder="Select To..."
              isClearable
            />
          </div>
        </div>

        {balanceMode === 'opening' && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Opening Only: year opening + vouchers before Date From. Period day transactions are excluded.
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={openPopupTab}
            disabled={isLoading || !startDate || !endDate}
            className={`pd-btn-save w-full ${isLoading || !startDate || !endDate ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Loading...' : 'Generate Trial Balance'}
          </button>
        </div>
      </div>
    </ReportPageLayout>
  );
};

export default TrailBalances;
