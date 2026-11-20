import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';


const SubLocalityEdit = () => {
  const { id } = useParams()
    const editSubLocality = useSelector((state) => state.SubLocality.Sublocality)
    //console.log(editSubLocality)

    const Locality = useSelector((state) => state.Locality.locality)
    const [editCat, seteditCat] = useState([])
    const [LocalitySelect, setSelectLocality] = useState(undefined)
    const getData = () => {
        const data = editSubLocality.find((item) => item._id == id)
        seteditCat(data)
        const selectVen = Locality.find((item) => item._id == data.Locality)
        //console.log(selectVen)
        setSelectLocality({
            value: selectVen._id,
            label: `${selectVen.LocalityName} ${selectVen.code} `
        })
        if (data) {
            reset({
                SubLocalityName: data.SubLocalityName,
                SaleFlowRef: data.SaleFlowRef,
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
            await updateDataFunction(`/SubLocality/updateSubLocality/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/SubLocalityList')
            }, 2000);
        } catch (err) {
            toast.error("Something went wrong")

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Sub Locality </h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Sub Locality Name </label>
                            <input
                                type="text"
                                defaultValue={editCat.SubLocalityName}
                                {...register("SubLocalityName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Sales Flow Ref </label>
                            <input
                                type="text"
                                {...register("SaleFlowRef")}
                                className="pd-input"
                            />
                        </div>
                        <div>
                            <label className="pd-label">Locality </label>
                            <AppSelect
                                value={LocalitySelect}
                                options={LocalitySelect}
                                isDisabled={true}
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Sub Locality
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
  )
}

export default SubLocalityEdit