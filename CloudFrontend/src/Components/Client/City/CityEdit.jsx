import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';


const CityEdit = () => {
    const { id } = useParams()
    const editCity = useSelector((state) => state.City.City)
    const [disabled, setDisabled] = useState(false)

    const Region = useSelector((state) => state.Region.Region)
    const [selectRegion, setSelectRegion] = useState('')

    const RegionDrp = Region.map((item) => ({
        value: item._id,
        label: item.RegionName
    }))

    const getData = () => {
        const data = editCity.find((item) => item._id == id)
        setSelectRegion(data.Region)
        if (data) {
            reset({
                CityName: data.CityName,
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
            setDisabled(true)
            await updateDataFunction(`/City/updateCity/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/CityList')
            }, 2000);
        } catch (err) {
            setDisabled(false)
            toast.error("Something went wrong")

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit City </h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">City Name </label>
                            <input
                                type="text"
                                {...register("CityName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Region</label>
                            <AppSelect onChange={(v) => setSelectRegion(v.value)} options={RegionDrp} isDisabled={true

                                
                            } placeholder="select zone" value={selectRegion ? {
                                value: Region.find((item) => item._id === selectRegion)._id,
                                label: Region.find((item) => item._id === selectRegion).RegionName
                            } : null} />
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={disabled}
                                className="pd-btn-save"
                            >
                                Edit City
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CityEdit