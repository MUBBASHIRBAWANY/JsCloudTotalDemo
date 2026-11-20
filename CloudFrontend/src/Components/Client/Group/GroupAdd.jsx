import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const GroupAdd = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },

  } = useForm();
  const vendor = useSelector((state) => state.Vendor.state)
  const zone = useSelector((state) => state.Zone.zone)

  const [selectedZone, setSelectedZone] = useState("")
  const Vendordrp = vendor.map((item) => {
    return { value: item._id, label: `${item.VendorName} (${item.code})` }
  })
  const onSubmit = async (data) => {
    const code = await getDataFundtion(`/Group/lastCode`)
    //console.log(code)
    code.data == null ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
    //console.log(data)
    data.Zone = selectedZone
    try {

      const res = await createDataFunction('Group/', data)

      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate("/Grouplist")
      }, 2000);
    } catch (err) {
      toast.success("Something went wrong")

    }
  }
  const zoneDrp = zone.map((item) => ({
    label: item.ZoneName,
    value: item._id,
  }))
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Group</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Group Name</label>
              <input
                type="text"
                {...register("GroupName")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Zone Name</label>
              <AppSelect options={zoneDrp} onChange={(e) => setSelectedZone(e.value)} />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add Group
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default GroupAdd