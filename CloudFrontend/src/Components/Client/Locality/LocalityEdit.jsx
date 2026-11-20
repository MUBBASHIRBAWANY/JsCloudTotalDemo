import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const LocalityEdit = () => {
    const { id } = useParams()
    const editLocality = useSelector((state) => state.Locality.locality)
    //console.log(editLocality)

    const Vendor = useSelector((state) => state.Vendor.state)
    const [editCat, seteditCat] = useState([])
    const [vendorSelect, setSelectVendor] = useState(undefined)
    const getData = () => {
        const data = editLocality.find((item) => item._id == id)

        seteditCat(data)
        const selectVen = Vendor.find((item) => item._id == data.vendor)
        //console.log(selectVen)
        setSelectVendor({
            value: selectVen._id,
            label: `${selectVen.VendorName} ${selectVen.code} `
        })
        if (data) {
            reset({
                LocalityName: data.LocalityName,
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
            await updateDataFunction(`/Locality/updateLocality/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/LocalityList')
            }, 2000);
        } catch (err) {
            toast.error("Something went wrong")

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Locality </h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Locality Name </label>
                            <input
                                type="text"
                                defaultValue={editCat.CategoryName}
                                {...register("LocalityName")}
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
                                Edit Locality
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
  )
}

export default LocalityEdit