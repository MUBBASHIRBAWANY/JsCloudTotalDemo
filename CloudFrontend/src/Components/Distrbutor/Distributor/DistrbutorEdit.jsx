import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { normalizePolicyList } from '../DistrbutorInvoice/advanceDiscount.js';

const DistrbutorEdit = () => {

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('basic');
    const pageName = "DistrbutorEdit"
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Vendor = useSelector((state) => state.Vendor.state)
    const Town = useSelector((state) => state.Town.Town)
    const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
    const ChannelType = useSelector((state) => state.ChannelType.channelType)
    const Channel = useSelector((state) => state.Channel.channel)
    const SubChannel = useSelector((state) => state.subChannel.subChannel)
    const Locality = useSelector((state) => state.Locality.locality)
    const [SelectVendor, setSelectVendor] = useState([])
    const [SelectPriceList, setSelectPriceList] = useState({})
    const [SelectChannel, setSelectChannel] = useState('')
    const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)
    const [city, setcity] = useState('')
    const [changeVendor, setchangeVendor] = useState('')
    const [SelectCity, setSelectCity] = useState('')
    const [selectedOrderBooker, setSelectedOrderBooker] = useState('')
    const [advanceDiscountPolicies, setAdvanceDiscountPolicies] = useState([])
    const [SelectAdvanceDiscountPolicy, setSelectAdvanceDiscountPolicy] = useState('')
    
    const City = useSelector((state) => state.City.City)

    const { id } = useParams()
    const EditDistributor = useSelector((state) => state.DistributroReducers.DistributroReducers)
    const editOrderBooker = useSelector((state) => state.DistributorOrderBooker.DistributorOrderBooker)

    const LocalityDrp = Locality.map((item) => {
        return ({
            value: item._id,
            label: `${item.LocalityName}`
        })
    })
    //console.log(LocalityDrp)

    const OrderBooker = editOrderBooker.map((item) => {
        return ({
            value: item._id,
            label: `${item.OrderBookerName} ${item.code}`
        })
    })

    const AllTown = Town.map((item) => ({
        value: item._id,
        label: `${item.TownName}`,
    }));

    const AllChannelType = ChannelType.map((item) => ({
        value: item._id,
        label: `${item.ChanneTypeName}`,
    }));

    const AllCity = City.map((item) => ({
        value: item._id,
        label: `${item.CityName}`,
    }));
    const AllPriceList = PriceList.map((item) => ({
        value: item._id,
        label: `${item.PriceListName}`,
    }));

    const AllAdvanceDiscountPolicy = advanceDiscountPolicies
        .filter((item) => item.Status == null || item.Status === "" || String(item.Status).toLowerCase() === "active")
        .map((item) => ({
        value: item._id,
        label: String(item.label ?? item.value),
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
    const getData = () => {
        const editdata = EditDistributor.find((item) => item._id == id)
        //console.log(editdata.OrderBooker)
        const orderBooker = editOrderBooker.find((item) => item._id == editdata.OrderBooker)
        const ci = City.find((item) => item._id == editdata.City)
        const Price = PriceList.find((item) => item._id == editdata.PriceList)
        const policy = advanceDiscountPolicies.find((item) => String(item._id) === String(editdata?.advanceDiscountPolicy))
        setSelectPriceList({
            value: Price?._id,
            label: Price?.PriceListName,
        })
        setSelectedOrderBooker({
            value: orderBooker?._id,
            label: orderBooker?.OrderBookerName,
        })
        setSelectCity({
            value: ci?._id,
            label: ci?.CityName,
        })
        setSelectAdvanceDiscountPolicy(
            policy
                ? { value: policy._id, label: String(policy.label ?? policy.value) }
                : ''
        )
        //console.log(EditDistributor)
        reset(editdata)
    }


    const onSubmit = async (data) => {
        const missingFields = []
        if (!data?.CNICNo?.trim()) missingFields.push("CNIC No.")
        if (!data?.MobileNo?.trim()) missingFields.push("Mobile No.")
        if (missingFields.length > 0) {
            setActiveTab('basic')
            toast.error(`${missingFields.join(" and ")} ${missingFields.length > 1 ? "are" : "is"} required`)
            return
        }
        if (!/^\d{5}-\d{7}-\d{1}$/.test(data?.CNICNo?.trim())) {
            setActiveTab('basic')
            toast.error("CNIC No. format should be like 42301-68438451-1")
            return
        }

        try {
            const wholedata = {
                ...data,
                OrderBooker: selectedOrderBooker.value,
                City: SelectCity.value,
                Password: data.Password1,
                PriceList: SelectPriceList.value,
                advanceDiscountPolicy: SelectAdvanceDiscountPolicy?.value || "",
            }
            const data1 = await updateDataFunction(`/Distrbutor/UpdateDistrbutor/${id}`, wholedata)
            toast.success("Distrbutor Edit")
            setTimeout(() => {
                navigate("/DistrbutorList")
            }, 2000)
        } catch (err) {
        }

    }
    useEffect(() => {
        const loadAdvanceDiscountPolicy = async () => {
            try {
                const result = await getDataFundtion("/AdvanceDiscountPolicy")
                setAdvanceDiscountPolicies(normalizePolicyList(result))
            } catch (error) {
                console.error("Error fetching advance discount policy:", error)
                setAdvanceDiscountPolicies([])
            }
        }
        loadAdvanceDiscountPolicy()
        getData()
    }, [])

    useEffect(() => {
        if (advanceDiscountPolicies.length > 0) {
            getData()
        }
    }, [advanceDiscountPolicies])

    return (
        <div>
            <div className='m-5'>
                <h1 className="pd-page-title text-center mb-6">Add Distrbutor</h1>
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
                                Distrbutor Information
                            </button>
                            <button
                                type="button"
                                className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'financial'
                                    ? 'border-[color:var(--pd-primary)] pd-text-primary'
                                    : 'pd-tab-inactive'
                                    }`}
                                onClick={() => setActiveTab('financial')}
                            >
                                Financial / Tax Information
                            </button>
                            <button
                                type="button"
                                className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'discounts'
                                    ? 'border-[color:var(--pd-primary)] pd-text-primary'
                                    : 'pd-tab-inactive'
                                    }`}
                                onClick={() => setActiveTab('discounts')}
                            >
                                Banking Information
                            </button>
                        </div>
                    </div>
                </div>

                <form className="pd-card p-6 mb-6" onSubmit={handleSubmit(onSubmit)}>
                    {/* Basic Info Tab */}
                    {activeTab === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            <div>
                                <label className="pd-label">Distrbutor Name</label>
                                <input
                                    type="text"
                                    {...register("DistrbutorName")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Owner Name</label>
                                <input
                                    type="text"
                                    {...register("OwnerName")}
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
                            {LoginerVendor.isDistributor == "true" ?
                                null :
                                <div>
                                    <label className="pd-label">Price List</label>
                                    <AppSelect options={AllPriceList} onChange={(e) => setSelectPriceList(e)} value={SelectPriceList} />
                                </div>
                            }
                            <div>
                                <label className="pd-label">Advance Discount Policy (%)</label>
                                <AppSelect
                                    options={AllAdvanceDiscountPolicy}
                                    onChange={(e) => setSelectAdvanceDiscountPolicy(e)}
                                    value={SelectAdvanceDiscountPolicy}
                                />
                            </div>
                            <div>
                                <label className="pd-label">Contact Person 1 *</label>
                                <input
                                    type="text"
                                    {...register("ContactPerson1")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Contact Person 2 *</label>
                                <input
                                    type="text"
                                    {...register("ContactPerson2")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Contact Person 3 *</label>
                                <input
                                    {...register("ContactPerson3")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Designation*</label>
                                <input
                                    {...register("Designation")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Address1*</label>
                                <input
                                    {...register("Address1")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Address2*</label>
                                <input
                                    {...register("Address2")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Address3*</label>
                                <input
                                    {...register("Address3")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">CNIC No.*</label>
                                <input
                                    {...register("CNICNo")}
                                    className="pd-input"
                                    placeholder="42301-68438451-1"
                                    maxLength="15"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Order Booker</label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <AppSelect options={OrderBooker} onChange={(e) => setSelectedOrderBooker(e)} value={selectedOrderBooker} />
                                    </div>
                                    <button
                                        disabled={!selectedOrderBooker?.value}
                                        onClick={() => selectedOrderBooker?.value && navigate(`/OrderBookerEdit/${selectedOrderBooker.value}`)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-blue-600"
                                        title="Edit selected Order Booker"
                                    >
                                        Edit
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="pd-label">City</label>
                                <AppSelect options={AllCity} onChange={(e) => setSelectCity(e)} value={SelectCity} />
                            </div>
                            <div>
                                <label className="pd-label">Country*</label>
                                <input
                                    {...register("Country")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Province*</label>
                                <input
                                    type="text"
                                    {...register("Province")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Mobile Phone No.*</label>
                                <input
                                    type="text"
                                    {...register("MobilePhoneNo")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Mobile No.1*</label>
                                <input
                                    type="text"
                                    {...register("MobileNo")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Mobile No.2*</label>
                                <input
                                    type="text"
                                    {...register("MobileNo2")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">CountryCode*</label>
                                <input
                                    type="text"
                                    {...register("CountryCode")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Postal Code*</label>
                                <input
                                    type="text"
                                    {...register("PostalCode")}
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
                                />
                            </div>
                            <div>
                                <label className="pd-label">PrimaryEmail</label>
                                <input
                                    type="email"
                                    {...register("PrimaryEmail")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">SecondaryEmail</label>
                                <input
                                    type="email"
                                    {...register("SecondaryEmail")}
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

                                />
                            </div>
                            <div>
                                <label className="pd-label"> Login Id</label>
                                <input
                                    type="text"
                                    {...register("LoginID")}
                                    className="pd-input"

                                />
                            </div>
                            <div>
                                <label className="pd-label"> Password</label>
                                <input
                                    type="text"
                                    {...register("Password1")}
                                    className="pd-input"

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
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                                <label className="pd-label">NTN Active</label>
                                <select name="" {...register("NTNStatus")} id="" className="pd-input">
                                    <option value="active">Active</option>
                                    <option value="Nonactive">NonActive</option>
                                </select>
                            </div>
                            <div>
                                <label className="pd-label">STN Active</label>
                                <select name="" {...register("STNStatus")} id="" className="pd-input">
                                    <option value="active">Active</option>
                                    <option value="Nonactive">NonActive</option>
                                </select>
                            </div>
                            <div>
                                <label className="pd-label">Company Type </label>
                                <input
                                    type="text"
                                    {...register("CompanyType")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Credit Days</label>
                                <input
                                    type="text"
                                    {...register("CreditDays")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">Credit Limit</label>
                                <input
                                    type="text"
                                    {...register("CreditLimit")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Discounts Tab */}
                    {activeTab === 'discounts' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div>
                                <label className="pd-label">BankName</label>
                                <input
                                    type="text"
                                    {...register("BankName")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">BranchName</label>
                                <input
                                    type="text"
                                    {...register("BranchName")}
                                    className="pd-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="pd-label">BranchCode</label>
                                <input
                                    type="text"
                                    {...register("BranchCode")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">BusinessAccountNumber</label>
                                <input
                                    type="text"
                                    {...register("BusinessAccountNumber")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Branch Address</label>
                                <input
                                    type="text"
                                    {...register("BranchAddress")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">BranchTel.No</label>
                                <input
                                    type="text"
                                    {...register("BranchAddress")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">Branch City</label>
                                <input
                                    type="text"
                                    {...register("BranchCity")}
                                    className="pd-input"
                                />
                            </div>
                            <div>
                                <label className="pd-label">IBAN</label>
                                <input
                                    type="text"
                                    {...register("IBAN")}
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
                                Edit Distrbutor
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}

export default DistrbutorEdit