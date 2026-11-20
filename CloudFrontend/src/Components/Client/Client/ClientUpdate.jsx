import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { toast, ToastContainer } from 'react-toastify'
import AppSelect from '../../Global/AppSelect.jsx'
import { updateDataFunction } from '../../../Api/CRUDFunctions'


const ClientUpdate = () => {
    const { id } = useParams()
    const allClient = useSelector((state) => state.Client.client)
    const Vendor = useSelector((state) => state.Vendor.state)
    const Channel = useSelector((state) => state.Channel.channel)
    const SubChannel = useSelector((state) => state.subChannel.subChannel)
    const ChannelType = useSelector((state) => state.ChannelType.channelType)
    const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
    const [findCutomer, setfindCustomer] = useState(null)
    const [activeTab, setActiveTab] = useState('basic');
    const [AreaDrp, setAreaDrp] = useState('')
    const [ZoneDrp, setZoneDrp] = useState('')
    const [RegionDrp, setRegionDrp] = useState('')
    const [ChannelDrp, setChannelDrp] = useState('')
    const [SubChannelDrp, setSubChannelDrp] = useState('')
    const [ChannelTypeDrp, setChannelTypeDrp] = useState('')
    const [SelectVendor, setSelectVendor] = useState('')
    const [SelectArea, setSelectArea] = useState('')
    const [SelectZone, setSelectZone] = useState('')
    const [SelectChannel, setSelectChannel] = useState('')
    const [SelectSubChannel, setSelectSubChannel] = useState('')
    const [SelectChannelType, setChannelType] = useState('')
    const [SelectRegion, setSelectRegion] = useState('')
    const [defultVendor, setdefultVendor] = useState([])
    const [SelectPriceList, setSelectPriceList] = useState('')

    const { register, handleSubmit, reset, formState: { errors } } = useForm()
    const navigate = useNavigate("/")
    const getData = async () => {
        const findClient = allClient.find((item) => item._id == id)
        
        setfindCustomer(findClient)
        if (findClient) {
            reset({
                CutomerName: findClient.CutomerName,
                phone: findClient.phone,
                email: findClient.email,
                Address: findClient.Address,
                NTN: findClient.NTN,
                STN: findClient.STN,
                Fax: findClient.Fax,
                WebSite: findClient.WebSite,
                ContactPerson: findClient.ContactPerson,
                PurchaseDate: findClient.PurchaseDate,
                SalesFlowRef: findClient.SalesFlowRef,
                ShopOwner: findClient.ShopOwner,
                OwnerCnic: findClient.OwnerCnic,
                ShopRegisterDate: findClient.ShopRegisterDate,
                Filler: findClient.Filler,
                Registered: findClient.Registered,
                TTS: findClient.TTS,
                TradeActivity: findClient.TradeActivity,
                VDS: findClient.VDS,
                Tradeoffer: findClient.Tradeoffer,
                JBP: findClient.JBP,
                Status: findClient.Status,
                AdvanceTaxApply: findClient.AdvanceTaxApply



            })
            const defultVendor = findClient.Vendor.map((cust) => Vendor.find(v => v._id == cust))
            const defultVendorOption = defultVendor.map((item) => ({
                label: `${item.VendorName} ${item.code}`,
                value: item._id
            }))
            setdefultVendor(defultVendorOption)
            setSelectVendor(findClient.Vendor)
            if (findClient.PriceList) {
                const pl = PriceList.find((item) => item._id == findClient.PriceList)
                setSelectPriceList({ value: pl?._id, label: pl?.PriceListName })
            }
        }
    }
    const onSubmit = async (data) => {
        try {
            data.PriceList = SelectPriceList?.value || ''
            const res = await updateDataFunction(`/customer/updatCustomer/${id}`, data)
            //console.log(res)
            toast.success("Data Edit")
            setTimeout(() => {
                navigate('/clientlist')
            }, 2000);
        } catch (err) {
            //console.log(err)
            toast.error("Something went wrong")
        }
    }
    const pageName = "CustomerEdit"
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const checkAcess = async () => {
        const allowAcess = await UserRihts.find((item) => item == pageName)
        //console.log(allowAcess)
        if (!allowAcess) {
            navigate("/")
        }
    }
    const VendorChnge = (id) => {
        setSelectVendor(id)
        setSelectZone('')
        setChannelType('')

        const AllZone = Zone.filter((item) => item.vendor == id).map((item) => ({
            value: item._id,
            label: `${item.ZoneName}`,
        }));
        const AllChanelType = ChannelType.filter((item) => item.vendor == id).map((item) => ({
            value: item._id,
            label: `${item.ChanneTypeName}`,
        }));
        setChannelTypeDrp(AllChanelType)
        setZoneDrp(AllZone);
    }

    const ZoneChange = (id) => {
        setSelectZone(id)
        setSelectRegion('')
        const AllRegion = Region.filter((item) => item.Zone == id).map((item) => ({
            value: item._id,
            label: `${item.RegionName}`,
        }));
        setRegionDrp(AllRegion);
    }

    const RegionChange = (id) => {
        setSelectRegion(id)
        setSelectArea('')
        const AllArea = Area.filter((item) => item.Region == id).map((item) => ({
            value: item._id,
            label: `${item.AreaName}`,
        }));
        //console.log(AllArea)
        setAreaDrp(AllArea);
    }

    const ChanelTypeChnage = (id) => {
        //console.log(id)
        setChannelType(id)
        setSelectChannel('')
        const AllChannel = Channel.filter((item) => item.ChanneType == id).map((item) => ({
            value: item._id,
            label: `${item.ChanneName}`,
        }));

        setChannelDrp(AllChannel);
    }
    const ChanelChnage = (id) => {
        setSelectChannel(id)
        const AllSubChenal = SubChannel.filter((item) => item.Channel == id).map((item) => ({
            value: item._id,
            label: `${item.SubChanneName}`,
        }));
        setSubChannelDrp(AllSubChenal)
    }
    const Allvendor = Vendor.map((item) => {
        return ({
            value: item._id,
            label: `${item.VendorName} ${item.code}`
        })
    })
    const AllPriceList = PriceList.map((item) => ({
        value: item._id,
        label: `${item.PriceListName}`,
    }))
    const ChenalTypeOp = [
        {
            label: "Whole Saller",
            value: 1
        },
        {
            label: "Retailer",
            value: 2
        },
    ]



    useEffect(() => {
        //checkAcess()

        getData()
    }, [])

    return (
        <div>
            <div>
                <h1 className="pd-page-title text-center mb-6">Edit Customer</h1>
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
                                    {...register("CutomerName", { required: true })}
                                    className="pd-input"

                                />
                                {errors.exampleRequired && <span>This field is required</span>}
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
                                <label className="pd-label">Sales Flow Ref</label>
                                <input
                                    type="email"
                                    {...register("SalesFlowRef")}
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
                                <label className="pd-label">Owner Name</label>
                                <input
                                    type="text"
                                    {...register("ShopOwner")}
                                    className="pd-input"

                                />
                            </div>
                            <div>
                                <label className="pd-label">Owner Cnic</label>
                                <input
                                    type="text"
                                    {...register("OwnerCnic")}
                                    className="pd-input"

                                />
                            </div>
                            <div>
                                <label className="pd-label">Shop Register Date</label>
                                <input
                                    type="Date"
                                    {...register("ShopRegisterDate")}
                                    className="pd-input"

                                />
                            </div>
                        </div>
                    )}

                    {/* Financial Details Tab */}
                    {activeTab === 'financial' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label"> Vendor </label>
                                <AppSelect
                                    isMulti
                                    isDisabled={true}
                                    defaultValue={defultVendor}
                                    options={Allvendor}
                                    onChange={(val) => VendorChnge(val.map(v => v.value))}
                                />
                            </div>
                          
                            <div>
                                <label className="pd-label"> Channel Type </label>
                                {findCutomer ? (
                                    <AppSelect isDisabled={true}
                                        defaultValue={
                                            findCutomer.ChannelType == 1
                                                ? { label: "Wholesaler", value: 1 }
                                                : { label: "Retailer", value: 2 }
                                        }
                                        options={ChenalTypeOp}
                                    // ...other props
                                    />
                                ) : (
                                    <p>Loading...</p>  // Or a spinner
                                )}
                            </div>
                            <div>
                                <label className="pd-label">Chanel</label>
                                <AppSelect
                                    isDisabled={true}
                                    defaultValue={
                                        {
                                            label: `${Channel?.find((item) => item._id == findCutomer?.Chanel)?.ChanneName}`,
                                            value: Channel?.find((item) => item._id == findCutomer?.Channel)?._id,
                                        }
                                    }
                                    onChange={(val) => ChanelChnage(val.value)} options={ChannelDrp} />
                            </div>
                            <div>
                                <label className="pd-label">Sub Channel </label>
                                <AppSelect
                                    isDisabled={true}
                                    defaultValue={
                                        {
                                            label: `${SubChannel?.find((item) => item._id == findCutomer?.SubChannel)?.SubChanneName}`,
                                            value: Channel?.find((item) => item._id == findCutomer?.Channel)?._id,
                                        }
                                    }
                                    options={SubChannelDrp} />
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
                            <div>
                                <label className="pd-label">Price List</label>
                                <AppSelect options={AllPriceList} value={SelectPriceList} onChange={(val) => setSelectPriceList(val)} />
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

                                />
                            </div>
                            <div>
                                <label className="pd-label">Trade Activity</label>
                                <input
                                    type="text"
                                    {...register("TradeActivity")}
                                    className="pd-input"

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

export default ClientUpdate