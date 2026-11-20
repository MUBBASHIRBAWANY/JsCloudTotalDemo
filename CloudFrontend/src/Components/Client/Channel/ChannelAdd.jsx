import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from "react-redux"
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions';

const ChannelAdd = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
    const navigate = useNavigate()
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const checkAcess = async () => {
        //console.log(UserRihts)
        const allowAcess = await UserRihts.find((item) => item == pageName)
        //console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }

    const onSubmit = async (data) => {
        const lastCode = await getDataFundtion('/Channel/lastcode')
        lastCode.data == null ? data.code = generateNextCode("01") : data.code = generateNextCode(lastCode.data.code)
        //console.log(data)
        try {
            await createDataFunction("/Channel", data)
            toast.success("Data Add")
            setTimeout(() => {
                navigate('/Channellist')
            }, 2000);

        } catch (err) {
            //console.log(err)
        }

    }
   
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Category</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Channel Name </label>
                            <input
                                type="text"
                                {...register("ChanneName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        
                        <div>
                            <label className="pd-label"> Channel Type </label>
                            <select
                                className="pd-input"
                                {...register("ChanneType")}>
                                <option value="1">Whole Saller</option>
                                <option value="2">Retailer</option>
                            </select>
                        </div>
                        <div>
                            <label className="pd-label"> Discount Type </label>
                            <select
                                className="pd-input"
                                {...register("DiscountType")}>
                                <option value="TPSale">Retail</option>
                                <option value="ToWholSale">Whole Saller</option>
                                <option value="OpenSindTo">SINDOPENMARKET</option>
                                <option value="ToDistriButor">DISTRIBUTOR</option>
                                <option value="Solo">Solo</option>
                            </select>
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                           <button type='submit' className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-6 py-2 focus:outline-none">
                                Add Channel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default ChannelAdd