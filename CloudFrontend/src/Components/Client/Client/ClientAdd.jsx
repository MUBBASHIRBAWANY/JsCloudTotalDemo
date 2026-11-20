import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode, generateNextCodeForCustomer } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, createDataFunction } from '../../../Api/CRUDFunctions';

const ClientAdd = () => {

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();



    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('basic');
    const pageName = "CustomerAdd"
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Vendor = useSelector((state) => state.Vendor.state)
    const Town = useSelector((state) => state.Town.Town)
    const Terrotory = useSelector((state) => state.Terrotory.Terrotory)
    const ChannelType = useSelector((state) => state.ChannelType.channelType)
    const Channel = useSelector((state) => state.Channel.channel)
    const SubChannel = useSelector((state) => state.subChannel.subChannel)
    const Locality = useSelector((state) => state.Locality.locality)
    const [SelectVendor, setSelectVendor] = useState([])
    const [SelectTown, setSelectTown] = useState('')
    const [SelectChannel, setSelectChannel] = useState('')
    const [SelectSubChannel, setSelectSubChannel] = useState('')
    const [SelectChannelType, setChannelType] = useState('')
    const [SelectTerrotory, setSelectTerrotory] = useState('')
    const [changeVendor, setchangeVendor] = useState('')
    const [selectLocality, setSelectLocality] = useState('')
    const [SelectPriceList, setSelectPriceList] = useState('')

    const Allvendor = Vendor.map((item) => {
        return ({
            value: item._id,
            label: `${item.VendorName} ${item.code}`
        })
    })
    const LocalityDrp = Locality.map((item) => {
        return ({
            value: item._id,
            label: `${item.LocalityName}`
        })
    })
    //console.log(LocalityDrp)

    const AllTerrotory = Terrotory.map((item) => ({
        value: item._id,
        label: `${item.TerrotoryName}`,
    }));

    const AllTown = Town.map((item) => ({
        value: item._id,
        label: `${item.TownName}`,
    }));

    const AllChannelType = ChannelType.map((item) => ({
        value: item._id,
        label: `${item.ChanneTypeName}`,
    }));

    const AllChannel = Channel.map((item) => ({
        value: item._id,
        label: `${item.ChanneName}`,
    }));
    const AllSubChenal = SubChannel.map((item) => ({
        value: item._id,
        label: `${item.SubChanneName}`,
    }));



    const VendorChnge = (id) => {
        setchangeVendor(id)
        const values = (id || []).map(option => option.value);
        setSelectVendor(values)
    }





    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == pageName)
        //console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }
    const ChenalTypeOp = [
        {
            label: "Whole Saller",
            value: "1"
        },
        {
            label: "Retailer",
            value: "2"
        },
    ]
    useEffect(() => {
      //  //checkAcess()
    }, [])
    const onSubmit = async (data) => {
        const lastCode = await getDataFundtion(`/customer/lastCustomor`)
        //console.log(lastCode.data)
        lastCode.data == null ? data.code = "000001" : data.code = generateNextCodeForCustomer(lastCode.data.code)
        data.Vendor = SelectVendor
        data.Terrotory = SelectTerrotory
        data.Town = SelectTown
        data.ChannelType = SelectChannelType
        data.Chanel = SelectChannel
        data.SubChannel = SelectSubChannel
        data.Locality = selectLocality
        data.PriceList = SelectPriceList
        //console.log(data)
        try {
            const res = await createDataFunction('/customer', data)
            //console.log(res)
            toast.success("Data Add")
            setTimeout(() => {
                navigate('/clientList')
            }, 2000);


        } catch (err) {
            toast.error("Something went wrong")
        }


    }
    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Add Customer</h1>
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
                                <label className="pd-label">Customer Name</label>
                                <input
                                    type="text"
                                    {...register("CutomerName")}
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
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Email</label>
                                <input
                                    type="email"
                                    {...register("email")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Sales Flow Ref</label>
                                <input
                                    type="email"
                                    {...register("SalesFlowRef")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Address</label>
                                <input
                                    type="text"
                                    {...register("Address")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">NTN</label>
                                <input
                                    type="text"
                                    {...register("NTN")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">STN</label>
                                <input
                                    type="text"
                                    {...register("STN")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Fax</label>
                                <input
                                    type="text"
                                    {...register("Fax")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">WebSite</label>
                                <input
                                    type="text"
                                    {...register("WebSite")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Owner Name</label>
                                <input
                                    type="text"
                                    {...register("ShopOwner")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Owner Cnic</label>
                                <input
                                    type="text"
                                    {...register("OwnerCnic")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Shop Register Date</label>
                                <input
                                    type="Date"
                                    {...register("ShopRegisterDate")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Financial Details Tab */}
                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label"> Business </label>
                                <AppSelect isMulti value={changeVendor} options={Allvendor} onChange={(val) => VendorChnge(val)} />
                            </div>
                            <div>
                                <label className="pd-label">Locality</label>
                                <AppSelect options={LocalityDrp} onChange={(val) => setSelectLocality(val.value)} />
                            </div>
                            <div>
                                <label className="pd-label">Terrotory</label>
                                <AppSelect options={AllTerrotory} onChange={(val) => setSelectTerrotory(val.value)} />
                            </div>
                            <div>
                                <label className="pd-label">Town</label>
                                <AppSelect onChange={(val) => setSelectTown(val.value)} options={AllTown} />
                            </div>
                            <div>
                                <label className="pd-label"> Channel Type </label>
                                <AppSelect options={AllChannelType} onChange={(val) => setChannelType(val.value)} />
                            </div>
                            <div>
                                <label className="pd-label">Chanel</label>
                                <AppSelect onChange={(val) => setSelectChannel(val.value)} options={AllChannel} />
                            </div>
                            <div>
                                <label className="pd-label">Sub Channel </label>
                                <AppSelect onChange={(val) => setSelectSubChannel(val.value)} options={AllSubChenal} />
                            </div>
                            <div>
                                <label className="pd-label"> Advance Tax Apply </label>
                                <select
                                    className="pd-input"
                                    {...register("AdvanceTaxApply")}>
                                    <option value="1">Yes</option>
                                    <option value="2">No</option>
                                </select>
                            </div>
                            <div>
                                <label className="pd-label"> Filler </label>
                                <select
                                    className="pd-input"
                                    {...register("Filler")}>
                                    <option value="1">Filler</option>
                                    <option value="2">Non-Filler</option>
                                </select>
                            </div>
                            <div>
                                <label className="pd-label"> Registered </label>
                                <select
                                    className="pd-input"
                                    {...register("Registered")}>
                                    <option value="1">Registered</option>
                                    <option value="2">Un Registered</option>
                                </select>
                            </div>
                            <div>
                                <label className="pd-label"> Status </label>
                                <select
                                    className="pd-input"
                                    {...register("Status")}>
                                    <option value="1">Active</option>
                                    <option value="2">non Active</option>
                                </select>
                            </div>
                          
                        </div>
                    )}

                    {/* Discounts Tab */}
                    {activeTab === 'discounts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label">TTS</label>
                                <input
                                    type="text"
                                    {...register("TTS")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Trade Activity</label>
                                <input
                                    type="text"
                                    {...register("TradeActivity")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">VDS</label>
                                <input
                                    type="text"
                                    {...register("VDS")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Trade Offer</label>
                                <input
                                    type="text"
                                    {...register("Tradeoffer")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">JBP</label>
                                <input
                                    type="text"
                                    {...register("JBP")}
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
                                Add Customer
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ClientAdd