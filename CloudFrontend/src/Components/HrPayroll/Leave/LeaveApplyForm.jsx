import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const LeaveApplyForm = () => {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fromDate = watch('fromDate');
  const toDate = watch('toDate');

  const calculateDays = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = end - start;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const days = calculateDays(fromDate, toDate);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, leaveRes] = await Promise.all([
          getDataFundtion('HrEmployee/').catch(() => ({ data: [] })),
          getDataFundtion('HrLeaveType/'),
        ]);
        setEmployees(empRes.data || []);
        setLeaveTypes(leaveRes.data || []);
      } catch {
        toast.error('Failed to load form data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        days: days || data.days,
        employeeId: data.employeeId,
        leaveType: data.leaveTypeId,
        startDate: data.fromDate,
        endDate: data.toDate,
      };
      await createDataFunction('/HrLeave/', payload);
      toast.success('Leave applied successfully');
      setTimeout(() => navigate('/LeaveApplicationList'), 1000);
    } catch {
      toast.error('Something went wrong');
    }
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      {loading ? (
        <p>Loading...</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="pd-form-grid">
          <div>
            <label className="block text-sm font-medium mb-1">Employee *</label>
            <select {...register('employeeId', { required: 'Required' })} className="w-full pd-input">
              <option value="">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.firstName} {emp.lastName || ''} ({emp.code})
                </option>
              ))}
            </select>
            {errors.employeeId && <p className="text-red-500 text-sm">{errors.employeeId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Leave Type *</label>
            <select {...register('leaveTypeId', { required: 'Required' })} className="w-full pd-input">
              <option value="">Select Leave Type</option>
              {leaveTypes.map((lt) => (
                <option key={lt._id} value={lt._id}>
                  {lt.name}
                </option>
              ))}
            </select>
            {errors.leaveTypeId && <p className="text-red-500 text-sm">{errors.leaveTypeId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From Date *</label>
            <input type="date" {...register('fromDate', { required: 'Required' })} className="w-full pd-input" />
            {errors.fromDate && <p className="text-red-500 text-sm">{errors.fromDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">To Date *</label>
            <input type="date" {...register('toDate', { required: 'Required' })} className="w-full pd-input" />
            {errors.toDate && <p className="text-red-500 text-sm">{errors.toDate.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Days *</label>
            <input
              type="number"
              {...register('days', { required: 'Required', min: { value: 1, message: 'Must be > 0' } })}
              className="w-full pd-input"
              defaultValue={days || ''}
            />
            {errors.days && <p className="text-red-500 text-sm">{errors.days.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <input type="text" {...register('reason')} className="w-full pd-input" placeholder="Reason for leave" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact During Leave</label>
            <input type="text" {...register('contactDuringLeave')} className="w-full pd-input" placeholder="Contact number" />
          </div>
          <div className="flex gap-3 mt-4">
            <button type="submit" className="pd-btn-save">Apply</button>
            <button type="button" className="pd-btn-outline" onClick={() => navigate('/LeaveApplicationList')}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
};

export default LeaveApplyForm;
