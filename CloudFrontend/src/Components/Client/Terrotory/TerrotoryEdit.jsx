import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const TerrotoryEdit = () => {
  const { id } = useParams()
  const editTerrotory = useSelector((state) => state.Terrotory.Terrotory)

  const Region = useSelector((state) => state.Region.region)
  //console.log(Region)
  const [editCat, seteditCat] = useState([])
  const [RegionSelect, setSelectRegion] = useState(undefined)
  const getData = () => {
    const data = editTerrotory.find((item) => item._id == id)

    seteditCat(data)
    const selectVen = Region.find((item) => item._id == data.Region)
    //console.log(selectVen)

    if (data) {
      reset({
        TerrotoryName: data.TerrotoryName,
        salesFlowRef: data.salesFlowRef,
      })
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
      await updateDataFunction(`/Terrotory/UpdateTerrotory/${id}`, data)
      toast.success("Data Edit")
      setTimeout(() => {
        navigate('/TerrotoryList')
      }, 2000);
    } catch (err) {
      toast.error("Something went wrong")

    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Edit Terrotory</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Terrotory Name </label>
              <input
                type="text"
                defaultValue={editCat.CategoryName}
                {...register("TerrotoryName")}
                className="pd-input"
                required
              />
            </div>
     
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Edit Terrotory
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TerrotoryEdit