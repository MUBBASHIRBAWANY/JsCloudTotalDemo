import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForMsku } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';


const MasterSkuAdd = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
    const navigate = useNavigate()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Brand = useSelector((state) => state.Brand.brand)
    const [prBrand, setPrBrand] = useState(null)
    const Branddrp = Brand.map((item) => {
        return { value: item._id, label: `${item.BrandName} (${item.code})` }
    })
    const pageName = "MasterSkuAdd"
    const onSubmit = async (data) => {
        if (!prBrand) {
            return toast.error("Brand is Requried")
        }
        try {
            const Brand1 = await getDataFundtion(`masterSku/mskubybrand/${prBrand}`)
            //console.log(Brand1.data)
            Brand1.data.length == 0 ? data.code = generateNextCodeForMsku(Brand1.data.length) : data.code = generateNextCodeForMsku(Brand1.data.slice(-1)[0].code)
            //console.log(Brand)
            data.mastercode = Brand.find((item) => item._id == prBrand).mastercode + data.code
            data.Brand = prBrand
            data.CodeRef = (Brand.find((item) => item._id == prBrand).CodeRef).slice(0, 5) + data.salesFlowRef
            //console.log(data)
            const res = await createDataFunction("/MasterSku/", data)
            toast.success("Data Add")
            setTimeout(() => {
                navigate('/masterskulist')
            }, 2000);
            //console.log(data)
        }
        catch (err) {
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
                <h1 className="pd-page-title text-center mb-6">Add Master Sku</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label"> Master Sku Add </label>
                            <input
                                type="text"
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
                            <AppSelect onChange={(val) => setPrBrand(val.value)} options={Branddrp} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add Master Sku
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default MasterSkuAdd