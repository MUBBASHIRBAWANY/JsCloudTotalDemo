import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';


const BrandEdit = () => {
    const { id } = useParams()
    const editCategory = useSelector((state) => state.Brand.brand)
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const category = useSelector((state) => state.Category.category)
    const [selectCat, setSelectCat] = useState(undefined)
    const pageName = "BrandEdit"
    //console.log(editCategory)
    const [editbrand, seteditbrand] = useState([])
    const getData = () => {
        const data = editCategory.find((item) => item._id == id)
        const defultCat = category.find((item) => item._id == data.category)
        setSelectCat({
            value: defultCat._id,
            label: `${defultCat.CategoryName}  ${defultCat.mastercode}`
        })

        seteditbrand(data)
        if (data) {
            reset({
                BrandName: data.BrandName,
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
            await updateDataFunction(`/brand/updateBrand/${id}`, data)

            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/brandList')
            }, 2000);
        } catch (err) {
            //console.log(err)
        }
        //console.log(data)
    }
    const UpdateInSND = async () => {
        const data = editCategory.find((item) => item._id == id)
        try {
            SndcreateDataFunction(`/brand`, data)
            toast.success("Update IN SND")
        } catch (err) {
            //console.log(err)
        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Brand</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Brand Name </label>
                            <input
                                type="text"
                                defaultValue={editbrand.BrandName}
                                {...register("BrandName")}
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
                            <label className="pd-label">Category</label>
                            <AppSelect value={selectCat} isDisabled={true} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Brand
                            </button>
                            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => UpdateInSND()}
                                    className="pd-btn-save"
                                >
                                    Update In SND
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default BrandEdit