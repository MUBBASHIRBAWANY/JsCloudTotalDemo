import React, { useState } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction } from '../../../Api/CRUDFunctions';

const provinces = ["All", "Sindh", "Punjab", "KPK", "Balochistan", "Islamabad"];
const religions = ["All", "Muslim", "Hindu", "Christian"];

const HolidayCalendarForm = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [name, setName] = useState('');
  const [province, setProvince] = useState('All');
  const [applicableReligion, setApplicableReligion] = useState('All');
  const [isOptional, setIsOptional] = useState(false);

  const onSubmit = async () => {
    if (!startDate || !name) return toast.error("Start Date and Name are required");
    try {
      await createDataFunction("/HolidayCalendar/", {
        startDate,
        endDate: endDate || startDate,
        name, province, applicableReligion, isOptional
      });
      toast.success("Holiday added");
      setTimeout(() => navigate("/HolidayCalendarList"), 1000);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Start Date *</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">End Date</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full pd-input" />
          <p className="text-xs text-gray-500 mt-1">Leave empty for single day holiday</p>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Holiday Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full pd-input" placeholder="e.g. Eid ul-Fitr" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Province</label>
          <select value={province} onChange={(e) => setProvince(e.target.value)} className="w-full pd-input">
            {provinces.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Applicable Religion</label>
          <select value={applicableReligion} onChange={(e) => setApplicableReligion(e.target.value)} className="w-full pd-input">
            {religions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Optional Holiday</label>
          <select value={isOptional} onChange={(e) => setIsOptional(e.target.value === 'true')} className="w-full pd-input">
            <option value={false}>No</option>
            <option value={true}>Yes</option>
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <button className="pd-btn-save" onClick={onSubmit}>Save</button>
        <button className="pd-btn-outline" onClick={() => navigate("/HolidayCalendarList")}>Cancel</button>
      </div>
    </div>
  );
};

export default HolidayCalendarForm;
