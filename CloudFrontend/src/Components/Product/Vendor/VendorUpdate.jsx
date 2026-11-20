import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { set, useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { data, useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions';


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
        //console.log(ven)
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
                ShortCode: ven.ShortCode



            })
        }
    }

    const pageName = "VenderEdit"
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == pageName)
        //console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }


    useEffect(() => {
        //checkAcess()
         
        getData()
    }, [id, allVender ])

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
        //console.log(data)
        try {
            const res = await updateDataFunction(`/vendor/updateVendor/${id}`, data)
            //console.log(res)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate("/VendorList")
            }, 2000);
            

        } catch (error) {
            toast.error("Error updating vendor")
            console.error(error)
        }
    }
    const StoreChnge = (id) => {
        
        setChangeStore(id)
        const values = (id || []).map(option => option.value);
        setSelectStore(values)
    }
    
    
    if (!findvendor) return <div>Loading...</div>
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Vendor</h1>
                <ToastContainer />
                <div className="mb-4">
                    <div className="flex border-b pd-border-default border">
                        <div className="flex border-b pd-border-default border">
                            <button
                                type="button"
                                className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'basic'
                                    ? 'border-[color:var(--pd-primary)] pd-text-primary'
                                    : 'pd-tab-inactive'
                                    }`}
                                onClick={() => setActiveTab('basic')}
                            >
                                Basic Info
                            </button>
                            <button
                                type="button"
                                className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'financial'
                                    ? 'border-[color:var(--pd-primary)] pd-text-primary'
                                    : 'pd-tab-inactive'
                                    }`}
                                onClick={() => setActiveTab('financial')}
                            >
                                Financial Details
                            </button>
                            <button
                                type="button"
                                className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'discounts'
                                    ? 'border-[color:var(--pd-primary)] pd-text-primary'
                                    : 'pd-tab-inactive'
                                    }`}
                                onClick={() => setActiveTab('discounts')}
                            >
                                Discounts
                            </button>
                        </div>
                    </div>
                </div>

                <form className="pd-card p-6 mb-6" onSubmit={handleSubmit(onSubmit)}>
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label">Short Code</label>
                                <input
                                    type="text"
                                    {...register("ShortCode")}
                                    maxLength={3}
                                    className="pd-input"
                                    required
                                    disabled={true}
                                />
                            </div>
                            <div>
                                <label className="pd-label">Vendor Name</label>
                                <input
                                    type="text"
                                    {...register("VendorName")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Sales Flow Ref</label>
                                <input
                                    type="text"
                                    {...register("salesFlowRef")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Phone</label>
                                <input
                                    type="text"
                                    {...register("phone")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Email</label>
                                <input
                                    type="email"
                                    {...register("email")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Address</label>
                                <input
                                    type="text"
                                    {...register("Address")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">NTN</label>
                                <input
                                    type="text"
                                    {...register("NTN")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">STN</label>
                                <input
                                    type="text"
                                    {...register("STN")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Fax</label>
                                <input
                                    type="text"
                                    {...register("Fax")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">WebSite</label>
                                <input
                                    type="text"
                                    {...register("WebSite")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Contact Person</label>
                                <input
                                    type="text"
                                    {...register("ContactPerson")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Purchase Date</label>
                                <input
                                    type="Date"
                                    {...register("PurchaseDate")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label"> Vendor </label>
                                <AppSelect
                                    isMulti
                                    defaultValue={defultStore}
                                    options={AllStore}
                                    value={changeStore}
                                    onChange={(val) => StoreChnge(val)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Financial Details Tab */}
                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label">Zone A/c</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Department</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Transport</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Price List</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Transport</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Dep Exp A/c</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Acc Dep Exp A/c</label>
                                <AppSelect />
                            </div>
                            <div>
                                <label className="pd-label">Dep %</label>
                                <input
                                    type="text"
                                    {...register("DepPercent")}
                                    className="pd-input"
                                />
                            </div>
                        </div>
                    )}

                    {/* Discounts Tab */}
                    {activeTab === 'discounts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label">Targeted Discount Percent</label>
                                <input
                                    type="text"
                                    {...register("TargetedDiscountPercent")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Targeted Discount Amount</label>
                                <input
                                    type="text"
                                    {...register("TargetedDiscount")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Cash Discount Percent</label>
                                <input
                                    type="text"
                                    {...register("CashDiscountPercent")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Cash Discount Amount</label>
                                <input
                                    type="text"
                                    {...register("CashDiscountAmount")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Advance Discount Amount</label>
                                <input
                                    type="text"
                                    {...register("AdvanceDiscountAmount")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Advance Discount %</label>
                                <input
                                    type="text"
                                    {...register("AdvanceDiscountPercent")}
                                    className="pd-input"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex justify-end">
                        {activeTab !== 'basic' && (
                            <button
                                type="button"
                                className="pd-btn-outline mr-4"
                                onClick={() => setActiveTab(activeTab === 'financial' ? 'basic' : 'financial')}
                            >
                                Previous
                            </button>
                        )}
                        {activeTab !== 'discounts' && (
                            <button
                                type="button"
                                className="pd-btn-save"
                                onClick={() => setActiveTab(activeTab === 'basic' ? 'financial' : 'discounts')}
                            >
                                Next
                            </button>
                        )}
                        {activeTab === 'discounts' && (
                            <button
                                type="submit"
                                className="pd-btn-save"
                            >
                                Edit Vendor
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>

    )
}

export default VendorUpdate