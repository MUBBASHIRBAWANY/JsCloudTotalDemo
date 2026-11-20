import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const TerrotoryAdd = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },

  } = useForm();
  const Region = useSelector((state) => state.Region.region)
  const [prRegion, setPrRegion] = useState("")
  const Regiondrp = Region.map((item) => {
    return { value: item._id, label: `${item.RegionName} (${item.code})` }
  })
  const onSubmit = async (data) => {
    const code = await getDataFundtion(`/Terrotory/lastCode`)
    //console.log(code.data)
    code.data == null  ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
    //console.log(data)
    try {
      const res = await createDataFunction('Terrotory/', data)
      //console.log(res)
      toast.success("Data Add")
      setTimeout(() => {
        navigate("/Terrotorylist")
      }, 2000);
    } catch (err) {
      toast.error("Something went wrong")

    }
  }
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Terrotory</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Terrotory Name</label>
              <input
                type="text"
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
                Add Terrotory
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TerrotoryAdd