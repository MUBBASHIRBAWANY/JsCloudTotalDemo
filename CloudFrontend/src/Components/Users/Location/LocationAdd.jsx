import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const LocationAdd = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },

  } = useForm();
        const UserRihts = useSelector((state) => state.UsersRights.UserRights)

  const checkAcess = async () => {
    const pageName = "Add Location2"
    const viweAcess = await UserRihts.find((item) => item == pageName)
    if (viweAcess == undefined) {

      //console.log(viweAcess)
      navigate("/")
    }
  }
  useEffect(() => {
    //checkAcess()
  }, [])
  const onSubmit = async (data) => {
    const code = await getDataFundtion(`/Location/lastCode`)
    //console.log(code.data)
    code.data == null ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
    //console.log(data)
    try {
      const res = await createDataFunction('/Location', data)
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate("/Locationlist")
      }, 2000);
    } catch (err) {
      toast.error("Something went wrong")

    }
  }
  return (
    <div className="pd-page">
      <div>
        <h1 className="pd-page-title text-center">Add Location</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Location Name</label>
              <input
                type="text"
                {...register("LocationName")}
                className="pd-input"
                required
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add Location
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LocationAdd