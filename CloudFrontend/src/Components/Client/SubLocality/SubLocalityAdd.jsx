import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../../Components/Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const SubLocalityAdd = () => {
  const navigate = useNavigate()
    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
    const Locality = useSelector((state) => state.Locality.locality)
    //console.log(Locality)
    const [prLocality, setPrLocality] = useState("")
    const Localitydrp = Locality.map((item) => {
        return { value: item._id, label: `${item.LocalityName} (${item.code})` }
    })
    const onSubmit = async (data) => {
        const code = await getDataFundtion(`/SubLocality/getLastByLocality/${prLocality}`)
        //console.log(code.data)
        code.data.length == 0 ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.slice(-1)[0].code)
        data.Locality = prLocality
         data.mastercode = Locality.find((item) => item._id == prLocality).code + data.code
        //console.log(data)
        try {
            const res = await createDataFunction('/SubLocality', data)
            //console.log(res)
            toast.success("Data Add")
            setTimeout(() => {
                navigate("/SubLocalityList")
            }, 2000);
        } catch (err) {
            toast.success("Something went wrong")

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Sub Locality</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Locality Name</label>
                            <input
                                type="text"
                                {...register("SubLocalityName")}
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
                            <label className="pd-label">Locality</label>
                            <AppSelect onChange={(val) => setPrLocality(val.value)} options={Localitydrp} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add SubLocality
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
  )
}

export default SubLocalityAdd