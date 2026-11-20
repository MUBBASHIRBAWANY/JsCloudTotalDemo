import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { generateNextCodeForCat } from '../../Global/GenrateCode';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const CityAdd = () => {
  const navigate = useNavigate()
  const Region = useSelector((state) => state.Region.Region)
  const [selectRegion , setSelectRegion] = useState('')

  const RegionDrp = Region.map((item) => ({
    value: item._id,
    label: item.RegionName
  }))

  const {
    register,
    handleSubmit,
    formState: { errors },

  } = useForm();
  const onSubmit = async (data) => {
    const code = await getDataFundtion(`/City/lastCode`)
    //console.log(code.data)
    code.data == null ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
    data.Region = selectRegion
    //console.log(data)

    try {
      const res = await createDataFunction('/City', data)
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate("/Citylist")
      }, 2000);
    } catch (err) {
      toast.success("Something went wrong")

    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add City</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">City Name</label>
              <input
                type="text"
                {...register("CityName")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Region</label>
              <AppSelect onChange={(v) => setSelectRegion(v.value)} options={RegionDrp} placeholder="select Region" />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add City
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CityAdd