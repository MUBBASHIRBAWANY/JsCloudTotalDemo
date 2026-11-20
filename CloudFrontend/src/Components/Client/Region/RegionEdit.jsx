import AppSelect from '../../Global/AppSelect.jsx'
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDataFunction } from '../../../Api/CRUDFunctions';



const RegionEdit = () => {
  const { id } = useParams()
  const editRegion = useSelector((state) => state.Region.Region)
  const Group = useSelector((state) => state.Group.Group)
  const [editReg, seteditReg] = useState([])
  const GroupDrp = Group.map((item) => ({
    value: item._id,
    label: item.GroupName
  }))


  const [selectGroup, setSelectGroup] = useState(undefined)
  const getData = () => {
    const data = editRegion.find((item) => item._id == id)
    //console.log(data)
    setSelectGroup(data.Group)
    seteditReg(data)
    const selectGroup = Group?.find((item) => item._id == data?.Group)
    //console.log(selectGroup)

    if (data) {
      reset({
        RegionName: data.RegionName,
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
      updateDataFunction(`/Region/UpdateRegion/${id}`, data)
      toast.success("Data Edit")
      setTimeout(() => {
        navigate('/RegionList')
      }, 2000);
    } catch (err) {
      //console.log(err)
    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Edit Region</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Region Name </label>
              <input
                type="text"
                defaultValue={editReg.RegionName}
                {...register("RegionName")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Group</label>
              <AppSelect value={selectGroup ? {
                  value : Group.find((item)=> item._id === selectGroup)._id,
                  label :  Group.find((item)=> item._id === selectGroup).GroupName
              } : null} onChange={(v) => setSelectGroup(v.value)} options={GroupDrp} isDisabled={true} defaultValue={selectGroup} placeholder="select Group" />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Edit Region
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RegionEdit