import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const LoanForm = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [employeeId, setEmployeeId] = useState('');
  const [loanType, setLoanType] = useState('advance');
  const [totalAmount, setTotalAmount] = useState('');
  const [monthlyDeduction, setMonthlyDeduction] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  useEffect(() => {
    getDataFundtion("HrEmployee/getEmployeeNameId").then((res) => setEmployees(res.data || []));
  }, []);

  const onSubmit = async () => {
    if (!employeeId || !totalAmount || !monthlyDeduction) return toast.error("Fill required fields");
    try {
      await createDataFunction("/HrLoan", {
        employeeId,
        loanType,
        totalAmount: Number(totalAmount),
        monthlyDeduction: Number(monthlyDeduction),
        startDate,
        description
      });
      toast.success("Loan added");
      setTimeout(() => navigate("/LoanList"), 1000);
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
          <label className="block text-sm font-medium mb-1">Loan Type *</label>
          <select value={loanType} onChange={(e) => setLoanType(e.target.value)} className="w-full pd-input">
            <option value="">Select</option>
            <option value="advance">Salary Advance</option>
            <option value="personal">Personal Loan</option>
            <option value="emergency">Emergency Loan</option>
            <option value="education">Education Loan</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Total Amount *</label>
          <input type="number" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} className="w-full pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Monthly Deduction *</label>
          <input type="number" value={monthlyDeduction} onChange={(e) => setMonthlyDeduction(e.target.value)} className="w-full pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pd-input" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full pd-input" />
        </div>
      </div>
      <div className="flex gap-3">
        <button className="pd-btn-save" onClick={onSubmit}>Save</button>
        <button className="pd-btn-outline" onClick={() => navigate("/LoanList")}>Cancel</button>
      </div>
    </div>
  );
};

export default LoanForm;
