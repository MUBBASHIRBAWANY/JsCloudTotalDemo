import React, { useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { generateNextCodeForMsku } from '../../Global/GenrateCode';

const ZsmAdd = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate()
  const Zone = useSelector((state) => state.Zone.zone)
console.log(Zone)
  const [prZone, setPrZone] = useState("")

  const onSubmit = async (data) => {
    data.Zone = prZone
    try {
      const lastCode = await getDataFundtion(`/Zsm/lastcode`)
      console.log(lastCode)
      if (!lastCode.data) {
        data.code = "001"
      }
      else {
        data.code = generateNextCodeForMsku(lastCode.data[0].code)
      }
      console.log(data)
      try {
        const res = await createDataFunction('/Zsm', data)
        toast.success("Data Added")
        setTimeout(() => {
          navigate('/ZsmList')
        }, 2000);
      } catch (err) {
        console.log(err)
        toast.error('Something went wrong')
      }
    } catch (err) {
      console.log(err)
      toast.error('Something went wrong')
    }
  }

  const Zonedrp = Zone.map((item) => {
    return { value: item._id, label: `${item.ZoneName} (${item.code})` }
  })

  return (
    <div className='mx-5'>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add ZSM</h1>
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
              <label className="pd-label">Zone </label>
              <AppSelect onChange={(val) => setPrZone(val.value)} options={Zonedrp} />
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
            <div>
              <label className="pd-label">Login Id</label>
              <input
                type="text"
                {...register("ZsmID")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Password </label>
              <input
                type="text"
                {...register("ZsmPassword")}
                className="pd-input"
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add ZSM
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ZsmAdd
