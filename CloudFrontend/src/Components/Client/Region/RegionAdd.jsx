import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';


const RegionAdd = () => {
    const navigate = useNavigate()
    const Group = useSelector((state) => state.Group.Group)
    const [selectGroup, setSelectGroup] = useState('')
    const [disabled, setDisabled] = useState(false)
    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
    const GroupDrp = Group.map((item) => ({
        value: item._id,
        label: item.GroupName
    }))

    const onSubmit = async (data) => {
        const code = await getDataFundtion(`/Region/lastCode`)
        setDisabled(true)
        code.data === null ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
        data.Group = selectGroup
        //console.log(data)

        try {
            const res = await createDataFunction('/Region', data)
            //console.log(res)
            toast.success("Data Add")
            setTimeout(() => {
                navigate("/Regionlist")
            }, 2000);
        } catch (err) {
            toast.error("Something went wrong")
            setDisabled(false)

        }
    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Region</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Region Name</label>
                            <input
                                type="text"
                                {...register("RegionName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Group</label>
                            <AppSelect onChange={(v) => setSelectGroup(v.value)} options={GroupDrp} placeholder="select Group" />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                disabled={disabled}
                                className="pd-btn-save"
                            >
                                Add Region
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default RegionAdd