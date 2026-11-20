import React, { useState } from 'react'
import { toast, ToastContainer } from 'react-toastify';
import { getDataFundtion } from '../../../Api/CRUDFunctions';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { applyPlugin } from 'jspdf-autotable';

const months = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const PayrollSummary = () => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
applyPlugin(jsPDF); 

  const years = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 5; y <= currentYear + 1; y++) years.push(y);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await getDataFundtion(`Payroll/summary?month=${month}&year=${year}`);
      setSummary(data.data);
    } catch {
      toast.error("Failed to load summary");
    }
    setLoading(false);
  };

  const exportPDF = () => {
    if (!summary) return;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Payroll Summary - ${months[month]} ${year}`, 14, 20);

    const t = summary.total;
    doc.setFontSize(11);
    doc.text(`Total Employees: ${t.totalEmployees}`, 14, 32);
    doc.text(`Total Basic Salary: Rs. ${t.totalBasicSalary.toLocaleString()}`, 14, 40);
    doc.text(`Total Gross Salary: Rs. ${t.totalGrossSalary.toLocaleString()}`, 14, 48);
    doc.text(`Total Deductions: Rs. ${t.totalDeductions.toLocaleString()}`, 14, 56);
    doc.text(`Total Net Salary: Rs. ${t.totalNetSalary.toLocaleString()}`, 14, 64);

    if (summary.byDepartment && summary.byDepartment.length > 0) {
      doc.autoTable({
        startY: 74,
        head: [['Department', 'Employees', 'Basic', 'Gross', 'Deductions', 'Net']],
        body: summary.byDepartment.map(d => [
          d._id || 'Unassigned',
          d.totalEmployees,
          `Rs. ${d.totalBasicSalary.toLocaleString()}`,
          `Rs. ${d.totalGrossSalary.toLocaleString()}`,
          `Rs. ${d.totalDeductions.toLocaleString()}`,
          `Rs. ${d.totalNetSalary.toLocaleString()}`
        ])
      });
    }

    doc.save(`Payroll_Summary_${months[month]}_${year}.pdf`);
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1">Month</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="pd-input">
            {months.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Year</label>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="pd-input">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button className="pd-btn-save" onClick={fetchSummary} disabled={loading}>
          {loading ? "Loading..." : "Load Summary"}
        </button>
        {summary && (
          <button className="pd-btn-outline" onClick={exportPDF}>Export PDF</button>
        )}
      </div>

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Employees', value: summary.total.totalEmployees },
              { label: 'Basic Salary', value: `Rs. ${summary.total.totalBasicSalary.toLocaleString()}` },
              { label: 'Gross Salary', value: `Rs. ${summary.total.totalGrossSalary.toLocaleString()}` },
              { label: 'Deductions', value: `Rs. ${summary.total.totalDeductions.toLocaleString()}` },
              { label: 'Net Salary', value: `Rs. ${summary.total.totalNetSalary.toLocaleString()}` },
            ].map((item, i) => (
              <div key={i} className="pd-stat-box p-4 rounded-lg" style={{ background: 'var(--pd-surface)' }}>
                <p className="text-sm text-gray-500">{item.label}</p>
                <p className="text-lg font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          <h3 className="font-semibold mb-3">Department-wise Breakdown</h3>
          <table className="w-full pd-data-table">
            <thead>
              <tr>
                <th>Department</th>
                <th>Employees</th>
                <th>Basic</th>
                <th>Gross</th>
                <th>Deductions</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {summary.byDepartment.map((d, i) => (
                <tr key={i}>
                  <td>{d._id || 'Unassigned'}</td>
                  <td>{d.totalEmployees}</td>
                  <td>Rs. {d.totalBasicSalary.toLocaleString()}</td>
                  <td>Rs. {d.totalGrossSalary.toLocaleString()}</td>
                  <td>Rs. {d.totalDeductions.toLocaleString()}</td>
                  <td>Rs. {d.totalNetSalary.toLocaleString()}</td>
                </tr>
              ))}
              {summary.byDepartment.length === 0 && (
                <tr><td colSpan={6} className="text-center py-4 text-gray-500">No payroll data for this period</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
};

export default PayrollSummary;
