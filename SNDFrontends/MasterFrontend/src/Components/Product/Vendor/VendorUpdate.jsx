import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { set, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { data, useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import Select from 'react-select'
import { updateDataFunction } from '../../../Api/CurdFunctions';


const VendorUpdate = () => {
    const { id } = useParams()
    const navigate = useNavigate()
    const vendorEdit = useSelector((state) => state)
    const allVender = vendorEdit.Vendor.state
    const Store = useSelector((state) => state.Store.Store)
    const [findvendor, setFindvendor] = useState(null)
    const [activeTab, setActiveTab] = useState('basic');
    const [defultStore, setdefultStore] = useState([])
    const [changeStore, setChangeStore] = useState("")
    const [selectStore, setSelectStore] = useState("")

    const { register, handleSubmit, reset } = useForm()


    const AllStore = Store.map((item) => {
        return {
            value: item._id,
            label: item.StoreName
        }
    })
    const getData = () => {
        const ven = allVender.find((item) => item._id == id)
        setFindvendor(ven)
        console.log(ven)
        if (ven) {
            reset({
                VendorName: ven.VendorName,
                phone: ven.phone,
                email: ven.email,
                Address: ven.Address,
                NTN: ven.NTN,
                STN: ven.STN,
                Fax: ven.Fax,
                salesFlowRef: ven.salesFlowRef,
                WebSite: ven.WebSite,
                ContactPerson: ven.ContactPerson,
                PurchaseDate: ven.PurchaseDate,
                DepPercent: ven.DepPercent,
                TargetedDiscountPercent: ven.TargetedDiscountPercent,
                TargetedDiscount: ven.TargetedDiscount,
                CashDiscountPercent: ven.CashDiscountPercent,
                CashDiscountAmount: ven.CashDiscountAmount,
                AdvanceDiscountAmount: ven.AdvanceDiscountAmount,
                AdvanceDiscountPercent: ven.AdvanceDiscountPercent,
                ShortCode: ven.ShortCode,
                AccountCode: ven.AccountCode


            })
        }
    }

    const pageName = "Edit Vendor"
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == pageName)
        console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }


    useEffect(() => {
        checkAcess()

        getData()
    }, [id, allVender])

    useEffect(() => {
        if (findvendor) {
            const selectedStores = findvendor.Store.map((storeId) => {
                const store = Store.find((store) => store._id === storeId);
                return {
                    value: store?._id,
                    label: store?.StoreName
                }
            });
            setdefultStore(selectedStores);
            setChangeStore(selectedStores);
            const values = selectedStores.map(option => option.value);
            setSelectStore(values);
        }
    }, [findvendor, Store]);

    const onSubmit = async (data) => {
        data.Store = selectStore
        console.log(data)
        try {
            const res = await updateDataFunction(`/vendor/updateVendor/${id}`, data)
            console.log(res)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate("/VendorList")
            }, 2000);


        } catch (error) {
            toast.error("Error updating vendor")
            console.error(error)
        }
    }


    if (!findvendor) return <div>Loading...</div>
    return (
        <div>
            <div>
                <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Edit Vendor</h1>
                <ToastContainer />

                <form className="bg-white p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>
                    {/* Basic Info Tab */}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Account Code</label>
                            <input
                                type="text"
                                disabled
                                {...register("AccountCode")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Vendor Name</label>
                            <input
                                type="text"
                                {...register("VendorName")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Phone</label>
                            <input
                                type="text"
                                {...register("phone")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Email</label>
                            <input
                                type="email"
                                {...register("email")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Address</label>
                            <input
                                type="text"
                                {...register("Address")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">NTN</label>
                            <input
                                type="text"
                                {...register("NTN")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">STN</label>
                            <input
                                type="text"
                                {...register("STN")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Fax</label>
                            <input
                                type="text"
                                {...register("Fax")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">WebSite</label>
                            <input
                                type="text"
                                {...register("WebSite")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Contact Person</label>
                            <input
                                type="text"
                                {...register("ContactPerson")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-semibold mb-2">Account Opening Date</label>
                            <input
                                type="Date"
                                {...register("PurchaseDate")}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className='mt-4'>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            Add Vendor
                        </button>

                    </div>
                </form>
            </div>
        </div>

    )
}

export default VendorUpdate