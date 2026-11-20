import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from "react-redux"
import AppSelect from '../../Global/AppSelect.jsx'
import {  updateDataFunction } from '../../../Api/CRUDFunctions'

const ChannelTypeEdit = () => {
  const { id } = useParams()
  const editChannelType = useSelector((state) => state.ChannelType.channelType)
  //console.log(editChannelType)
  const Vendor = useSelector((state) => state.Vendor.state)
  const [editCat, seteditCat] = useState([])
  const [vendorSelect, setSelectVendor] = useState(undefined)
  const getData = () => {
    const data = editChannelType.find((item) => item._id == id)
    seteditCat(data)
    const selectVen = Vendor.find((item) => item._id == data.vendor)
    //console.log(selectVen)
    setSelectVendor({
      value: selectVen._id,
      label: `${selectVen.VendorName} ${selectVen.code} `
    })
    if (data) {
      reset({
        ChanneTypeName: data.ChanneTypeName,
        salesFlowRef: data.salesFlowRef,
      })
    }

  }
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const pageName = "ChannelEdit"
  const checkAcess = async () => {
    //console.log(UserRihts)
    const allowAcess = await UserRihts.find((item) => item == pageName)
    //console.log(allowAcess)
    if (!allowAcess) {
      navigate("/")
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
      updateDataFunction(`/chanelType/updateChannelType/${id}`, data)
      toast.success("Data Edit")
      setTimeout(() => {
        navigate('/ChannelTypeList')
      }, 2000);
    } catch (err) {
      //console.log(err)
    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Edit Channel Type</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Channel Type Name </label>
              <input
                type="text"
                defaultValue={editCat.ChannelName}
                {...register("ChanneTypeName")}
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
              <label className="pd-label">Vendor </label>
              <AppSelect
                value={vendorSelect}
                options={vendorSelect}
                isDisabled={true}
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Edit Channel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChannelTypeEdit