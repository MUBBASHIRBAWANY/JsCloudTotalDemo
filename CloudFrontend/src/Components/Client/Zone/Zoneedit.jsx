import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const Zoneedit = () => {
    const { id } = useParams()
    const editZone = useSelector((state) => state.Zone.zone)

    const Vendor = useSelector((state) => state.Vendor.state)
    const [editCat, seteditCat] = useState([])
    const [vendorSelect, setSelectVendor] = useState(undefined)
    const getData = () => {
        const data = editZone.find((item) => item._id == id)
        seteditCat(data)
        
      
        if (data) {
            reset({
                ZoneName: data.ZoneName,
                
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
            await updateDataFunction(`/zone/UpdateZone/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/ZoneList')
            }, 2000);
        } catch (err) {
            toast.error("Something went wrong")

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edic Category</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Zone Name </label>
                            <input
                                type="text"
                                defaultValue={editCat.CategoryName}
                                {...register("ZoneName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Zone
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default Zoneedit