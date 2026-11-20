import AppSelect from '../../Global/AppSelect.jsx'
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDataFunction } from '../../../Api/CRUDFunctions';


const TownEdit = () => {
  const { id } = useParams()
  const editTown = useSelector((state) => state.Town.Town)
  const Zone = useSelector((state) => state.Zone.zone)
  const [editReg, seteditReg] = useState([])
  const [selectZone, setSelectzone] = useState(undefined)
  const getData = () => {
    const data = editTown.find((item) => item._id == id)
    //console.log(data)
    seteditReg(data)
    const selectZone = Zone?.find((item) => item._id == data?.Zone)
    //console.log(selectZone)
  
    if (data) {
      reset({
        TownName: data.TownName,
        salesFlowRef: data.salesFlowRef,
      })
    }

  }
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const pageName = "CategoryEdit"
  const checkAcess = async () => {
    //console.log(UserRihts)
    const allowAcess = await UserRihts.find((item) => item == pageName)
    //console.log(allowAcess)
    if (!allowAcess) {
      navigate("/")
    }
  }
  useEffect(() => {
    //checkAcess()
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
      updateDataFunction(`/Town/UpdateTown/${id}`, data)
      toast.success("Data Edit")
      setTimeout(() => {
        navigate('/TownList')
      }, 2000);
    } catch (err) {
      //console.log(err)
    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Edit Town</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Town Name </label>
              <input
                type="text"
                defaultValue={editReg.TownName}
                {...register("TownName")}
                className="pd-input"
                required
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Edit Town
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TownEdit