import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ToastContainer, toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions'

const  EarningDeductionCodeForm = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  useEffect(() => {
    if (isEdit) getDataFundtion(`/HrEarningDeductionCode/${id}`).then(res => reset(res.data))
  }, [id])

  const onSubmit = async (data) => {
    try {
      const payload = { ...data, defaultAmount: Number(data.defaultAmount) || 0 }
      if (isEdit) { await updateDataFunction(`/HrEarningDeductionCode/update/${id}`, payload); toast.success('Updated') }
      else { await createDataFunction('/HrEarningDeductionCode', payload); toast.success('Added') }
      setTimeout(() => navigate('/HrEarningDeductionList'), 1000)
    } catch { toast.error('Something went wrong') }
  }

  return (
    <div className="pd-card p-6">
      <ToastContainer />
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Code *</label>
          <input {...register('code', { required: 'Required' })} className="w-full pd-input" placeholder="e.g. 101" />
          {errors.code && <p className="text-red-500 text-sm">{errors.code.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <input {...register('description', { required: 'Required' })} className="w-full pd-input" placeholder="e.g. BASIC SALARY" />
          {errors.description && <p className="text-red-500 text-sm">{errors.description.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Type *</label>
          <select {...register('type', { required: 'Required' })} className="w-full pd-input">
            <option value="">Select</option>
            <option value="earning">Earning</option>
            <option value="deduction">Deduction</option>
          </select>
          {errors.type && <p className="text-red-500 text-sm">{errors.type.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Default Amount</label>
          <input type="number" {...register('defaultAmount')} className="w-full pd-input" defaultValue={0} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Link Account (GL)</label>
          <input {...register('linkAccount')} className="w-full pd-input" placeholder="e.g. SALARIES EXP." />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <input type="checkbox" {...register('active')} id="active" className="accent-blue-600" defaultChecked />
          <label htmlFor="active" className="text-sm font-medium">Active</label>
        </div>
        <div className="col-span-2 flex gap-3 mt-4">
          <button type="submit" className="pd-btn-save">{isEdit ? 'Update' : 'Save'}</button>
          <button type="button" className="pd-btn-outline" onClick={() => navigate('/HrEarningDeductionList')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default EarningDeductionCodeForm
