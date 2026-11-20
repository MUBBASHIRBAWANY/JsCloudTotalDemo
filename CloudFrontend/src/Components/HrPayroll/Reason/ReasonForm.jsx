import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ToastContainer, toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions'

const ReasonForm = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  useEffect(() => {
    if (isEdit) getDataFundtion(`/HrReason/${id}`).then(res => reset(res.data))
  }, [id])

  const onSubmit = async (data) => {
    try {
      if (isEdit) { await updateDataFunction(`/HrReason/update/${id}`, data); toast.success('Updated') }
      else { await createDataFunction('/HrReason', data); toast.success('Added') }
      setTimeout(() => navigate('/HrReasonList'), 1000)
    } catch { toast.error('Something went wrong') }
  }

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <form onSubmit={handleSubmit(onSubmit)} className="pd-form-grid">
        <div>
          <label className="block text-sm font-medium mb-1">Code *</label>
          <input {...register('code', { required: 'Required' })} className="w-full pd-input" />
          {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <input {...register('description', { required: 'Required' })} className="w-full pd-input" />
          {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select {...register('type', { required: 'Required' })} className="w-full pd-input">
            <option value="">Select</option>
            <option value="joining">Joining</option>
            <option value="leaving">Leaving</option>
          </select>
          {errors.type && <p className="text-red-500 text-sm">{errors.type.message}</p>}
        </div>
        <div className="flex gap-3 mt-4">
          <button type="submit" className="pd-btn-save">{isEdit ? 'Update' : 'Save'}</button>
          <button type="button" className="pd-btn-outline" onClick={() => navigate('/HrReasonList')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default ReasonForm
