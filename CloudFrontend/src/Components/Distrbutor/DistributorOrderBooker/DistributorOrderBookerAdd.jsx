import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { generateNextCodeForMsku } from '../../Global/GenrateCode';

const DistributorOrderBookerAdd = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },

  } = useForm();
  const navigate = useNavigate()
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const Region = useSelector((state) => state.Region.Region)

  const pageName = "CategoryAdd"
  const [prRegion, setPrRegion] = useState("")
  const checkAcess = async () => {
    //console.log(UserRihts)
    const allowAcess = await UserRihts.find((item) => item == pageName)
    //console.log(allowAcess)
    if (!allowAcess) {
      navigate("/")
    }
  }
 
  const onSubmit = async (data) => {
    data.Region = prRegion
    //console.log(data)
    try {
      const lastCode = await getDataFundtion(`/DitriButorOrderBooker/getLastDitriButorOrderBooker`)
      //console.log(lastCode)
      if (lastCode.data.length == 0) {
        data.code = "001"
      }
      else {
        data.code = generateNextCodeForMsku(lastCode.data[0].code)
      }
      try {
        const res = await createDataFunction('/DitriButorOrderBooker', data)
        toast.success("Data Add")
        setTimeout(() => {
          navigate('/OrderBookerList')
        }, 2000);
      } catch (err) {
        //console.log(err)
        toast.error('Something went wrong')
      }


    } catch (err) {
      //console.log(err)
      toast.error('Something went wrong')
    }
  }
  //console.log(Region)
  const Regiondrp = Region.map((item) => {
    return { value: item._id, label: `${item.RegionName} (${item.code})` }
  })
  return (
  <div className='mx-5'>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Order Booker</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid lg:grid-cols-4 mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Order Booker Name </label>
              <input
                type="text"
                {...register("OrderBookerName")}
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
              <AppSelect onChange={(val) => setPrRegion(val.value)} options={Regiondrp} />
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
              <label className="pd-label">Cnic </label>
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
                {...register("OrderBookerID")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Password </label>
              <input
                type="text"
                {...register("OrderBookerPassword")}
                className="pd-input"
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add Order Booker
              </button>
              
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DistributorOrderBookerAdd