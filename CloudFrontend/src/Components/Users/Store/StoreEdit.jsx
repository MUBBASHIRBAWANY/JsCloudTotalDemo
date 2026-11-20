import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDataFunction } from '../../../Api/CRUDFunctions';
import AppSelect from '../../Global/AppSelect.jsx'
const StoreEdit = () => {
    const { id } = useParams()
    const locationEdit = useSelector((state) => state.Store.Store)
    const location = useSelector((state) => state.Location.Location)
    const [editLocation, seteditLocation] = useState([])
    const [selectedLocation , setselectedLocation] = useState([])

    const LocationDrp = location?.map((item) => {
        return { value: item._id, label: item.LocationName }
    })

    const defaultLocation = useMemo(() => {
        if (!editLocation || !editLocation.Location) return null;
        const found = location.find(item => item._id === editLocation.Location);
        return found ? { value: found._id, label: found.LocationName } : null;
    }, [editLocation, location]);

    const getData = () => {
        const data = locationEdit.find((item) => item._id == id)
        //console.log(data)
        seteditLocation(data)

        if (data) {
            reset({
                StoreName: data.StoreName,
                isActive: data.isActive !== false,
                BalanceFromAging: data.BalanceFromAging || false,
                StockWithoutTax: data.StockWithoutTax || false,
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
            console.log(data)
            await updateDataFunction(`/Store/UpdateStore/${id}`, data)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/Storelist')
            }, 2000);
        } catch (err) {
            //console.log(err)
        }
    }
    return (
        <div className="pd-page">
            <div>
                <h1 className="pd-page-title text-center">Edit Store</h1>
                <ToastContainer />
                <div>
                    <form className="pd-form-grid" onSubmit={handleSubmit(onSubmit)}>
                        <div>
                            <label className="pd-label">Location Name </label>
                            <input
                                type="text"
                                defaultValue={editLocation.StoreName}
                                {...register("StoreName")}
                                className="pd-input"
                                required
                            />
                        </div>
                        <div>
                            <label className="pd-label">Location</label>
                            <AppSelect
                                onChange={(val) => setselectedLocation(val.value)}
                                options={LocationDrp}
                                value={defaultLocation}
                                isDisabled={true}
                            />
                        </div>
                        <div>
                            <label className="pd-label">Is Active</label>
                            <input
                                type="checkbox"
                                {...register("isActive")}
                                className="pd-input"
                            />
                        </div>
                        <div>
                            <label className="pd-label">Balance From Aging</label>
                            <input
                                type="checkbox"
                                {...register("BalanceFromAging")}
                                className="pd-input"
                            />
                        </div>
                        <div>
                            <label className="pd-label">Stock Without Tax</label>
                            <input
                                type="checkbox"
                                {...register("StockWithoutTax")}
                                className="pd-input"
                            />
                        </div>
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Store
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

export default StoreEdit