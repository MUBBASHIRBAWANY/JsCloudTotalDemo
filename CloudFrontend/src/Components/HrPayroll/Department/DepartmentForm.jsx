import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';

const DepartmentForm = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  useEffect(() => {
    if (isEdit) {
      getDataFundtion(`/HrDepartment/${id}`).then((res) => {
        reset(res.data);
      });
    }
  }, [id]);

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateDataFunction(`/HrDepartment/updateDepartment/${id}`, data);
        toast.success("Department updated");
      } else {
        await createDataFunction("/HrDepartment", data);
        toast.success("Department added");
      }
      setTimeout(() => navigate("/DepartmentList"), 1000);
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
          <input
            {...register("name", { required: "Name is required" })}
            className="w-full pd-input"
            placeholder="Department name"
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            {...register("description")}
            className="w-full pd-input"
            rows={3}
            placeholder="Department description"
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button type="submit" className="pd-btn-save">
            {isEdit ? "Update" : "Save"}
          </button>
          <button type="button" className="pd-btn-outline" onClick={() => navigate("/DepartmentList")}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default DepartmentForm;
