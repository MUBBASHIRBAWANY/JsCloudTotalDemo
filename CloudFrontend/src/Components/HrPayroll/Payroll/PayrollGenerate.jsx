import React, { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction } from '../../../Api/CRUDFunctions';

const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PayrollGenerate = () => {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await createDataFunction("/Payroll/generate", { month, year });
      setResult(res);
      toast.success(res.message || "Payroll generated");
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Month *</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full pd-input">
            {months.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Year *</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full pd-input">
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <button className="pd-btn-save" onClick={handleGenerate} disabled={loading}>
            {loading ? "Generating..." : "Generate Payroll"}
          </button>
        </div>
      </div>

      {result && (
        <div className="mt-4 p-4 rounded" style={{ background: 'var(--pd-surface)' }}>
          <p className="font-semibold">{result.message}</p>
          {result.data && result.data.length > 0 && (
            <p className="text-sm mt-1 text-gray-600">
              Total net salary: Rs. {result.data.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()}
            </p>
          )}
          <button className="pd-btn-outline mt-3 text-sm" onClick={() => navigate("/PayrollList")}>
            View Payroll List
          </button>
        </div>
      )}
    </div>
  );
};

export default PayrollGenerate;
