import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCodeForCat } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { useEffect, useState } from 'react';
import AppSelect from '../../Global/AppSelect.jsx'
const StoreAdd = () => {
    const navigate = useNavigate()
    const [selectedLocation, setselectedLocation] = useState("")
        const UserRihts = useSelector((state) => state.UsersRights.UserRights)

    const {
        register,
        handleSubmit,
        formState: { errors },

    } = useForm();
    
    let Location = useSelector((state) => state.Location.Location)
    //console.log(Location)
    const LocationDrp = Location?.map((item) => {
        return { value: item._id, label: item.LocationName }
    })

    const onSubmit = async (data) => {
        const code = await getDataFundtion(`/Store/lastCode`)
        //console.log(code.data)
        code.data == null ? data.code = generateNextCodeForCat('00') : data.code = generateNextCodeForCat(code.data.code)
        data.Location = selectedLocation
        //console.log(data)
        try {
            const res = await createDataFunction('/Store', data)
            //console.log(res)
            toast.success("Data Add")
            setTimeout(() => {
                navigate("/Storelist")
            }, 2000);
        } catch (err) {
            toast.error("Something went wrong")

        }
    }
    const checkAcess = async () => {
        const pageName = "Add Store"
        const viweAcess = await UserRihts.find((item) => item == pageName)
        if (viweAcess == undefined) {
            
            //console.log(viweAcess)
                  navigate("/")
        }
    }
    useEffect(() => {
        //checkAcess()
    }, [])
    return (
        <div className="pd-page">
            <div>
                <h1 className="pd-page-title text-center">Add Store</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Store Name</label>
                            <input
                                type="text"
                                {...register("StoreName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Location Name</label>
                            <AppSelect onChange={(val) => setselectedLocation(val.value)} options={LocationDrp} />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Add Store
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StoreAdd