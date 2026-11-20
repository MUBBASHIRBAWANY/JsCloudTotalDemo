import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const LocalityAdd = () => {
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
    const code = await getDataFundtion(`/Locality/getLastByVendor/${prVendor}`)
    //console.log(code.data)
    code.data.length == 0 ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.slice(-1)[0].code)
    //console.log(data)
    data.vendor = prVendor
    data.mastercode = vendor.find((item) => item._id == prVendor).code + data.code
    try {
      const res = await createDataFunction('Locality/', data)
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate("/Localitylist")
      }, 2000);
    } catch (err) {
      toast.success("Something went wrong")

    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Locality</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Locality Name</label>
              <input
                type="text"
                {...register("LocalityName")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Sales Flow Ref</label>
              <input
                type="text"
                {...register("SaleFlowRef")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Vendor</label>
              <AppSelect onChange={(val) => setPrVendor(val.value)} options={Vendordrp} />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add Locality
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LocalityAdd