import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDataFunction } from '../../../Api/CRUDFunctions';


const LocationEdit = () => {
    const { id } = useParams()
    const locationEdit = useSelector((state) => state.Location.Location)
    //console.log(locationEdit)
    const Zone = useSelector((state) => state.Zone.zone)
    const [editLocation, seteditLocation] = useState([])
    const [selectZone, setSelectzone] = useState(undefined)
    const getData = () => {
        const data = locationEdit.find((item) => item._id == id)
        //console.log(data)
        seteditLocation(data)
        const selectZone = Zone?.find((item) => item._id == data?.Zone)
        //console.log(selectZone)

        if (data) {
            reset({
                LocationName: data.LocationName,
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
          await  updateDataFunction(`/Location/Updatelocation/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/LocationList')
            }, 2000);
        } catch (err) {
            //console.log(err)
        }
    }
    
    return (
        <div className="pd-page">
            <div>
                <h1 className="pd-page-title text-center">Edit Location</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Location Name </label>
                            <input
                                type="text"
                                defaultValue={editLocation.LocationName}
                                {...register("LocationName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Location
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default LocationEdit