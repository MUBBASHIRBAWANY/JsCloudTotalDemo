import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { ToastContainer, toast } from 'react-toastify'
import { useNavigate, useParams } from 'react-router-dom'
import { createDataFunction, getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions'

const ContractorForm = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm()
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = Boolean(id)

  useEffect(() => {
    if (isEdit) {
      getDataFundtion(`/HrContractor/${id}`).then(res => reset(res.data))
    }
  }, [id])

  const onSubmit = async (data) => {
    try {
      if (isEdit) {
        await updateDataFunction(`/HrContractor/update/${id}`, data)
        toast.success('Contractor updated')
      } else {
        await createDataFunction('/HrContractor', data)
        toast.success('Contractor added')
      }
      setTimeout(() => navigate('/HrContractorList'), 1000)
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
          <label className="block text-sm font-medium mb-1">Name *</label>
          <input {...register('name', { required: 'Required' })} className="w-full pd-input" />
          {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contact Info</label>
          <input {...register('contactInfo')} className="w-full pd-input" />
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" {...register('active')} id="active" className="accent-blue-600" />
          <label htmlFor="active" className="text-sm font-medium">Active</label>
        </div>
        <div className="flex gap-3 mt-4">
          <button type="submit" className="pd-btn-save">{isEdit ? 'Update' : 'Save'}</button>
          <button type="button" className="pd-btn-outline" onClick={() => navigate('/HrContractorList')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

export default ContractorForm
