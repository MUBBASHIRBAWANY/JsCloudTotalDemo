import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import Select from 'react-select';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const SalaryAdvanceForm = () => {
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [form, setForm] = useState({ employeeId: null, amount: '', paymentMethod: 'bank', remarks: '' });

    useEffect(() => {
        getDataFundtion('HrEmployee/').then(res => {
            const list = (res.data || []).map(e => ({ value: e._id, label: `${e.code} - ${e.firstName} ${e.lastName || ''}` }));
            setEmployees(list);
        });
    }, []);

    const handleSubmit = async () => {
        if (!form.employeeId || !form.amount) return toast.error("Employee and Amount required");
        try {
            await createDataFunction('SalaryAdvance/', {
                employeeId: form.employeeId.value,
                amount: parseFloat(form.amount),
                paymentMethod: form.paymentMethod,
                remarks: form.remarks
            });
            toast.success("Salary Advance created");
            navigate('/SalaryAdvanceList');
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to create");
        }
    };

    return (
        <div className="pd-card p-6 max-w-2xl">
            <ToastContainer />
            <h2 className="pd-section-title mb-4">New Salary Advance</h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Employee</label>
                    <Select options={employees} value={form.employeeId} onChange={v => setForm(p => ({ ...p, employeeId: v }))} placeholder="Type to search..." isClearable />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Amount (Rs.)</label>
                    <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className="w-full pd-input" />
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Payment Method</label>
                    <select value={form.paymentMethod} onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))} className="w-full pd-input">
                        <option value="bank">Bank Transfer</option>
                        <option value="cash">Cash</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium mb-1">Remarks</label>
                    <textarea value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} className="w-full pd-input" rows={3} />
                </div>
            </div>

            <div className="mt-6 flex gap-3">
                <button className="pd-btn-save" onClick={handleSubmit}>Submit</button>
                <button className="pd-btn-outline" onClick={() => navigate('/SalaryAdvanceList')}>Cancel</button>
            </div>
        </div>
    );
};

export default SalaryAdvanceForm;
