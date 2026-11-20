import React, { useState, useMemo } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction } from '../../../Api/CRUDFunctions';
import { useSelector } from 'react-redux';
import { validateClosingMonth } from '../../Global/validateClosingMonth';

const PostDepreciation = () => {
  const navigate = useNavigate();
  const loginVendor = useSelector((state) => state.LoginerReducer.userDetail);
  const [loading, setLoading] = useState(false);

  // Generate last 12 months
  const monthOptions = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      const monthName = d.toLocaleString('default', { month: 'long' });
      const lastDay = new Date(year, month + 1, 0).getDate();
      months.push({
        label: `${monthName} ${year}`,
        value: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        lastDate: `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
        year,
        month: month + 1,
      });
    }
    return months;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '');
  const [lastDate, setLastDate] = useState(monthOptions[0]?.lastDate || '');

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setSelectedMonth(val);
    const found = monthOptions.find((m) => m.value === val);
    if (found) {
      setLastDate(found.lastDate);
    }
  };

  const onSubmit = async () => {
    if (!selectedMonth || !lastDate) {
      return toast.error('Please select a month and date');
    }

    if (validateClosingMonth(lastDate, loginVendor)) {
      return;
    }

    setLoading(true);
    try {
      const res = await createDataFunction('/FixedAsset/postDepreciation', { VoucherDate: lastDate });
      toast.success(res.message || 'Depreciation posted successfully');
      setTimeout(() => {
        navigate('/FixedAssetList');
      }, 1000);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <ToastContainer />
      <h1 className="text-xl md:text-3xl font-bold text-center pd-text-body mb-6">
        Post Depreciation
      </h1>

      <div className="pd-card p-4 md:p-6 max-w-xl mx-auto">
        <div className="mb-4">
          <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">
            Select Month
          </label>
          <select
            value={selectedMonth}
            onChange={handleMonthChange}
            className="pd-input text-sm md:text-base"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-6">
          <label className="block text-sm md:text-base pd-text-body font-semibold mb-2">
            Last Date
          </label>
          <input
            type="date"
            value={lastDate}
            onChange={(e) => setLastDate(e.target.value)}
            className="pd-input text-sm md:text-base"
          />
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/FixedAssetList')}
            className="pd-btn-outline px-4 py-2 text-sm md:text-base"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={loading}
            className="pd-btn-save px-4 py-2 text-sm md:text-base"
          >
            {loading ? 'Processing...' : 'Post Depreciation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostDepreciation;
