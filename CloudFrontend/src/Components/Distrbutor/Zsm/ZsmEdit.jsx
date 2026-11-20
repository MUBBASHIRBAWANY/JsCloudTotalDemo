import AppSelect from '../../Global/AppSelect.jsx'
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const ZsmEdit = () => {
  const { id } = useParams()
  const editZsm = useSelector((state) => state.Zsm.Zsm)
  const Region = useSelector((state) => state.Region.Region)
  const [editData, setEditData] = useState([])
  const [regionSelect, setSelectRegion] = useState(undefined)

  const getData = () => {
    const data = editZsm.find((item) => item._id == id)
    setEditData(data)
    if (data) {
      const selectRegion = Region.find((item) => item._id == data.Region)
      if (selectRegion) {
        setSelectRegion({
          value: selectRegion._id,
          label: `${selectRegion.RegionName} (${selectRegion.code})`
        })
      }
      reset({
        ZsmName: data.ZsmName,
        salesFlowRef: data.salesFlowRef,
        Address: data.Address,
        Cnic: data.Cnic,
        PhoneNumber: data.PhoneNumber
      })
    }
  }

  useEffect(() => {
    getData()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm();
  const navigate = useNavigate()

  const onSubmit = async (data) => {
    try {
      updateDataFunction(`/Zsm/updateZsm/${id}`, data)
      toast.success("Data Updated")
      setTimeout(() => {
        navigate('/ZsmList')
      }, 2000);
    } catch (err) {
      console.log(err)
    }
  }

  const Regiondrp = Region.map((item) => {
    return { value: item._id, label: `${item.RegionName} (${item.code})` }
  })

  return (
    <div className='mx-5'>
      <div>
        <h1 className="pd-page-title text-center mb-6">Edit ZSM</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid lg:grid-cols-4 mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">ZSM Name </label>
              <input
                type="text"
                {...register("ZsmName")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Sales Flow Ref </label>
              <input
                type="text"
                {...register("salesFlowRef")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Region </label>
              <AppSelect isDisabled={true} value={regionSelect} options={Regiondrp} />
            </div>
            <div>
              <label className="pd-label">Address </label>
              <input
                type="text"
                {...register("Address")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">CNIC </label>
              <input
                type="text"
                {...register("Cnic")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Phone Number </label>
              <input
                type="text"
                {...register("PhoneNumber")}
                className="pd-input"
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Edit ZSM
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ZsmEdit
