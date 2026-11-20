import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const ZoneAdd = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },

  } = useForm();
  const vendor = useSelector((state) => state.Vendor.state)
  const [prVendor, setPrVendor] = useState("")
  const Vendordrp = vendor.map((item) => {
    return { value: item._id, label: `${item.VendorName} (${item.code})` }
  })
  const onSubmit = async (data) => {
    const code = await getDataFundtion(`/Zone/lastCode`)
    //console.log(code)
    code.data == null ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
    //console.log(data)
    
    try {
      const res = await createDataFunction('zone/', data)
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate("/Zonelist")
      }, 2000);
    } catch (err) {
      toast.success("Something went wrong")

    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Zone</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Zone Name</label>
              <input
                type="text"
                {...register("ZoneName")}
                className="pd-input"
                required
              />
            </div>
            
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add Zone
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ZoneAdd