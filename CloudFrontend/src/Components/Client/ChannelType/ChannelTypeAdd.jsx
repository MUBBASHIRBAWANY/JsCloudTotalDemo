import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux"
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions';

const ChannelTypeAdd = () => {
  const {
          register,
          handleSubmit,
          formState: { errors },
  
      } = useForm();
      const navigate = useNavigate()
      const UserRihts = useSelector((state) => state.UsersRights.UserRights)
      const Vendor = useSelector((state) => state.Vendor.state)
      const pageName = "CategoryAdd"
      const [prVendor, setPrVendor] = useState("")
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
      }, [])
      const onSubmit = async (data) => {
  
          let getCatByVendor = await getDataFundtion(`/chanelType/ChannelTypeByvendor/${prVendor}`)
          data.vendor = prVendor
          getCatByVendor.data.length == 0 ? data.code = generateNextCodeForCat(getCatByVendor.data.length) : data.code = generateNextCodeForCat(getCatByVendor.data.slice(-1)[0].code)
          data.mastercode = Vendor.find((item) => item._id == prVendor).code + data.code
          //console.log(data)
          try {
  
              await createDataFunction("/chanelType", data)
              toast.success("Data Add")
              setTimeout(() => {
                  navigate('/ChannelTypelist')
              }, 2000);
  
          } catch (err) {
              //console.log(err)
          }
  
      }
      const Vendordrp = Vendor.map((item) => {
          return { value: item._id, label: `${item.VendorName} (${item.code})` }
      })
  return (
    <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Channel Type</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Channel Name </label>
                            <input
                                type="text"
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
                            <AppSelect onChange={(val) => setPrVendor(val.value)} options={Vendordrp} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add Channel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
  )
}

export default ChannelTypeAdd