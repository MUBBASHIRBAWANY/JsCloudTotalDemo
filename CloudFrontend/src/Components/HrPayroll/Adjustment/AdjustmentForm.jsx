import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const AdjustmentForm = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [type, setType] = useState('bonus');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    getDataFundtion("HrEmployee/getEmployeeNameId").then((res) => setEmployees(res.data || []));
  }, []);

  const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);

  const onSubmit = async () => {
    if (!employeeId || !amount) return toast.error("Fill required fields");
    try {
      await createDataFunction("/HrPayrollAdjustment", { employeeId, month, year, type, amount: Number(amount), description });
      toast.success("Adjustment added");
      setTimeout(() => navigate("/AdjustmentList"), 1000);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Employee *</label>
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="w-full pd-input">
            <option value="">Select</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.firstName} {e.lastName} ({e.code})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full pd-input">
            <option value="bonus">Bonus</option>
            <option value="arrear">Arrear</option>
            <option value="advance-recovery">Advance Recovery</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Amount *</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="w-full pd-input">
            {months.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="w-full pd-input">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full pd-input" />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="pd-btn-save" onClick={onSubmit}>Save</button>
        <button className="pd-btn-outline" onClick={() => navigate("/AdjustmentList")}>Cancel</button>
      </div>
    </div>
  );
};

export default AdjustmentForm;
