import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const TownAdd = () => {
    const navigate = useNavigate()
    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
   
    const onSubmit = async (data) => {
        const code = await getDataFundtion(`/Town/lastCode`)
        //console.log(code.data)
        code.data.length == 0 ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
        //console.log(data)
       
        try {
            const res = await createDataFunction('/Town', data)
            //console.log(res)
            toast.success("Data Add")
            setTimeout(() => {
                navigate("/Townlist")
            }, 2000);
        } catch (err) {
            toast.success("Something went wrong")

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Town</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Town Name</label>
                            <input
                                type="text"
                                {...register("TownName")}
                                className="pd-input"
                                required
                            />
                        </div>
                       
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add Town
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default TownAdd