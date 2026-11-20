import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const BrandAdd = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
    const pageName = "BrandAdd"
    const navigate = useNavigate()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const category = useSelector((state) => state.Category.category)
    const [prCat, setprCat] = useState(null)

    const CategoryDrp = category.map((item) => {
        return { value: item._id, label: `${item.CategoryName} (${item.code})` }
    }
    )

    const onSubmit = async (data) => {
        if (!prCat) {
            return toast.error("Category is Required")
        }
        try {
            const brandbycat = await getDataFundtion(`brand/getBrandByCat/${prCat}`)
            //console.log(brandbycat.data)
            brandbycat.data.length == 0 ? data.code = generateNextCodeForCat(brandbycat.data.length) : data.code = generateNextCodeForCat(brandbycat.data.slice(-1)[0].code)
            data.mastercode = category.find((item) => item._id === prCat).mastercode + data.code
            data.category = prCat
            data.CodeRef = (category.find((item) => item._id === prCat).CodeRef).slice(0 , 3) + data.salesFlowRef
            //console.log(data)

            await createDataFunction("/brand", data)
            toast.success("Data Add")
            setTimeout(() => {
                navigate('/brandList')
            }, 2000);

        } catch (err) {
            //console.log(err)
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
    }, [])
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Brand</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Brand Add </label>
                            <input
                                type="text"
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
                            <AppSelect onChange={(val) => setprCat(val.value)} options={CategoryDrp} />
                        </div>

                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add Brand
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default BrandAdd