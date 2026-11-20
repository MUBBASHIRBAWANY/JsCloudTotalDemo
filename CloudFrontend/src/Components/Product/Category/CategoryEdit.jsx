import AppSelect from '../../Global/AppSelect.jsx'
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { SndcreateDataFunction, updateDataFunction } from '../../../Api/CRUDFunctions';


const CategoryEdit = () => {
    const { id } = useParams()
    const editCategory = useSelector((state) => state.Category.category)
    const Vendor = useSelector((state) => state.Vendor.state)
    const [editCat, seteditCat] = useState([])
    const [vendorSelect, setSelectVendor] = useState(undefined)
    const getData = () => {
        const data = editCategory.find((item) => item._id == id)
        seteditCat(data)
        const selectVen = Vendor.find((item) => item._id == data.vendor)
        //console.log(selectVen)
        setSelectVendor({
            value: selectVen._id,
            label: `${selectVen.VendorName} ${selectVen.code} `
        })
        if (data) {
            reset({
                CategoryName: data.CategoryName,
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
    const UpdateInSND = async () => {
        const data = editCategory.find((item) => item._id == id)
        try {
            SndcreateDataFunction(`/Category`, data)
            toast.success("Update IN SND")
        } catch (err) {
            //console.log(err)
        }
    }
    const onSubmit = async (data) => {
        try {
            updateDataFunction(`/Category/updateCategory/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/CategoryList')
            }, 2000);
        } catch (err) {
            //console.log(err)
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
                            <label className="pd-label">Category Edit </label>
                            <input
                                type="text"
                                defaultValue={editCat.CategoryName}
                                {...register("CategoryName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Sales Flow Ref </label>
                            <input
                                type="text"
                                {...register("salesFlowRef")}
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
                                Edit Category
                            </button>
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="button"
                                onClick={()=> UpdateInSND()}
                                className="pd-btn-save"
                            >
                                Update In SND
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default CategoryEdit