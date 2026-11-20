import React, { useEffect, useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const EmployeeBulkAdd = () => {
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [rows, setRows] = useState([
    { firstName: '', lastName: '', phone: '', departmentId: '', designationId: '', basicSalary: '' }
  ]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getDataFundtion("HrDepartment/getDepartmentNameId").then((res) => setDepartments(res.data || []));
    getDataFundtion("HrDesignation/getDesignationNameId").then((res) => setDesignations(res.data || []));
  }, []);

  const addRow = () => {
    setRows([...rows, { firstName: '', lastName: '', phone: '', departmentId: '', designationId: '', basicSalary: '' }]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const updated = [...rows];
    updated[index][field] = value;
    setRows(updated);
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData('text');
    const lines = text.split('\n').filter(l => l.trim());
    const newRows = lines.map(line => {
      const cols = line.split('\t');
      return {
        firstName: cols[0] || '',
        lastName: cols[1] || '',
        phone: cols[2] || '',
        departmentId: '',
        designationId: '',
        basicSalary: cols[3] || ''
      };
    });
    if (newRows.length > 0) {
      setRows([...rows, ...newRows]);
      toast.success(`${newRows.length} rows pasted`);
    }
  };

  const handleSubmit = async () => {
    const validRows = rows.filter(r => r.firstName && r.departmentId && r.designationId && r.basicSalary);
    if (validRows.length === 0) return toast.error("No valid rows to submit");
    const payload = validRows.map(r => ({
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      departmentId: r.departmentId,
      designationId: r.designationId,
      salarySetupBasket: { basicSalary: Number(r.basicSalary) || 0, allowances: { fuel: 0, transport: 0, dearnessAllowance: 0, specialAllowance: 0 } }
    }));
    setLoading(true);
    try {
      await createDataFunction("/HrEmployee/AddInBulk", payload);
      toast.success(`${validRows.length} employees added`);
      setTimeout(() => navigate("/EmployeeHrList"), 1500);
    } catch {
      toast.error("Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-2">Paste from Excel (tab-separated): Name, Last Name, Phone, Salary</p>
        <div
          contentEditable
          onPaste={handlePaste}
          className="w-full p-3 border rounded pd-input min-h-[60px]"
          placeholder="Paste data here..."
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full pd-data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>First Name *</th>
              <th>Last Name</th>
              <th>Phone</th>
              <th>Department *</th>
              <th>Designation *</th>
              <th>Basic Salary *</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td><input value={row.firstName} onChange={(e) => handleChange(i, 'firstName', e.target.value)} className="w-full pd-input text-sm" /></td>
                <td><input value={row.lastName} onChange={(e) => handleChange(i, 'lastName', e.target.value)} className="w-full pd-input text-sm" /></td>
                <td><input value={row.phone} onChange={(e) => handleChange(i, 'phone', e.target.value)} className="w-full pd-input text-sm" /></td>
                <td>
                  <select value={row.departmentId} onChange={(e) => handleChange(i, 'departmentId', e.target.value)} className="w-full pd-input text-sm">
                    <option value="">Select</option>
                    {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </td>
                <td>
                  <select value={row.designationId} onChange={(e) => handleChange(i, 'designationId', e.target.value)} className="w-full pd-input text-sm">
                    <option value="">Select</option>
                    {designations.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
                  </select>
                </td>
                <td><input type="number" value={row.basicSalary} onChange={(e) => handleChange(i, 'basicSalary', e.target.value)} className="w-full pd-input text-sm" /></td>
                <td>
                  {rows.length > 1 && (
                    <button className="text-red-500 text-sm" onClick={() => removeRow(i)}>X</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3 mt-4">
        <button className="pd-btn-outline" onClick={addRow}>+ Add Row</button>
        <button className="pd-btn-save" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : `Save ${rows.filter(r => r.firstName).length} Employees`}
        </button>
        <button className="pd-btn-outline" onClick={() => navigate("/EmployeeHrList")}>Cancel</button>
      </div>
    </div>
  );
};

export default EmployeeBulkAdd;
