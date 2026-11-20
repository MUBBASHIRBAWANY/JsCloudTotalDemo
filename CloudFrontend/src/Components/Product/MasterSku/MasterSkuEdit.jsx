import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const MasterSkuEdit = () => {
    const { id } = useParams()
    const editMasterSku = useSelector((state) => state.MasterSku.MasterSku)
    const Brand = useSelector((state) => state.Brand.brand)
    const [selectBrand, setSeletBrand] = useState(undefined)
    const [editMSku, seteditMSku] = useState([])
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const pageName = "MasterSkuEdit"
    const getData = () => {
        const data = editMasterSku.find((item) => item._id == id)
        seteditMSku(data)
        const defultBrand = Brand.find((item) => item._id == data.Brand)
        setSeletBrand({
            value: defultBrand._id,
            label: defultBrand.BrandName
        })
        if (data) {
            reset({
                MasterSkuName: data.MasterSkuName,
                salesFlowRef: data.salesFlowRef
            })
        }

    }
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
            updateDataFunction(`/MasterSku/updateMasterSku/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/masterskulist')
            }, 2000);
        } catch (err) {
            //console.log(err)
        }
        //console.log(data)
    }

    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Master Sku</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Master Sku Name </label>
                            <input
                                type="text"
                                defaultValue={editMSku.MasterSkuName}
                                {...register("MasterSkuName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label"> Sales Flow Ref </label>
                            <input
                                type="text"
                                {...register("salesFlowRef")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Brand</label>
                            <AppSelect value={selectBrand} isDisabled={true} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Master Sku
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default MasterSkuEdit