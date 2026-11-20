import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';

const LeaveTypeForm = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      getDataFundtion(`/HrLeaveType/${id}`).then((res) => reset(res.data));
    }
  }, [id]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateDataFunction(`/HrLeaveType/${id}`, data);
        toast.success("Updated");
      } else {
        await createDataFunction("/HrLeaveType", data);
        toast.success("Added");
      }
      setTimeout(() => navigate("/LeaveTypeList"), 1000);
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <form onSubmit={handleSubmit(onSubmit)} className="pd-form-grid">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input {...register("name", { required: "Required" })} className="w-full pd-input" placeholder="e.g. Casual Leave" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Code</label>
          <input {...register("code")} className="w-full pd-input" placeholder="e.g. CL" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Max Days</label>
          <input type="number" {...register("maxDays")} className="w-full pd-input" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Gender</label>
          <select {...register("gender")} className="w-full pd-input">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="All">All</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Active</label>
          <select {...register("active")} className="w-full pd-input">
            <option value={true}>Yes</option>
            <option value={false}>No</option>
          </select>
        </div>
        <div className="flex gap-3 mt-4">
          <button type="submit" className="pd-btn-save">{isEdit ? "Update" : "Save"}</button>
          <button type="button" className="pd-btn-outline" onClick={() => navigate("/LeaveTypeList")}>Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default LeaveTypeForm;
