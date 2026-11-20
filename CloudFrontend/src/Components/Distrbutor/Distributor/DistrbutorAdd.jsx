import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { normalizePolicyList } from '../DistrbutorInvoice/advanceDiscount.js';

const DistrbutorAdd = () => {

    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('basic');
    const pageName = "DistrbutorAdd"
    const UserRihts = useSelector((state) => state.UsersRights.UserRights)
    const Vendor = useSelector((state) => state.Vendor.state)
    const Town = useSelector((state) => state.Town.Town)
    const Terrotory = useSelector((state) => state.Terrotory.Terrotory)
    const PriceList = useSelector((state) => state.PricelistReducer.PricelistReducer)
    const LoginerVendor = useSelector((state) => state.LoginerReducer.userDetail)

    const Transport = useSelector((state) => state.Transport.Transport)
    const City = useSelector((state) => state.City.City)
    const Locality = useSelector((state) => state.Locality.locality)
    const editOrderBooker = useSelector((state) => state.DistributorOrderBooker.DistributorOrderBooker)

    const [SelectVendor, setSelectVendor] = useState([])
    const [DistributorType, setDistributorType] = useState("Cust")
    const [SelectPriceList, setSelectPriceList] = useState('')
    const [SelectCity, setSelectCity] = useState('')
    const [SelectTransportType, setTransportType] = useState('')
    const [SelectTransporter, setSelectTransporter] = useState('')
    const [changeVendor, setchangeVendor] = useState('')
    const [selectedOrderBooker, setSelectedOrderBooker] = useState('')
    const [advanceDiscountPolicies, setAdvanceDiscountPolicies] = useState([])
    const [SelectAdvanceDiscountPolicy, setSelectAdvanceDiscountPolicy] = useState(null)


    const OrderBooker = editOrderBooker.map((item) => {
        return ({
            value: item._id,
            label: `${item.OrderBookerName} ${item.code}`
        })
    })
    const LocalityDrp = Locality.map((item) => {
        return ({
            value: item._id,
            label: `${item.LocalityName}`
        })
    })
    //console.log(LocalityDrp)

    const AllTransport = Transport.map((item) => ({
        value: item._id,
        label: `${item.TransporterName}`,
    }));

    const AllTown = Town.map((item) => ({
        value: item._id,
        label: `${item.TownName}`,
    }));

    const AllPriceList = PriceList.map((item) => ({
        value: item._id,
        label: `${item.PriceListName}`,
    }));

    const AllCity = City.map((item) => ({
        value: item._id,
        label: `${item.CityName}`,
    }));

    const AllAdvanceDiscountPolicy = advanceDiscountPolicies
        .filter((item) => item.Status == null || item.Status === "" || String(item.Status).toLowerCase() === "active")
        .map((item) => ({
        value: String(item._id),
        label: String(item.label ?? `${item.value}%`),
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
    }, [])

    // Keep 0% selected by default once options are available
    useEffect(() => {
        if (!advanceDiscountPolicies.length || SelectAdvanceDiscountPolicy?.value) return
        const zero = advanceDiscountPolicies.find(
            (item) => Number(item.value) === 0 || String(item.label).replace(/\s/g, "") === "0%"
        )
        if (!zero) return
        setSelectAdvanceDiscountPolicy({
            value: String(zero._id),
            label: String(zero.label ?? "0%"),
        })
    }, [advanceDiscountPolicies, SelectAdvanceDiscountPolicy])
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
            data.PriceList = SelectPriceList.value
            data.City = SelectCity.value,
                data.OrderBooker = selectedOrderBooker.value
            data.Transporter = SelectTransporter.value
            data.advanceDiscountPolicy =
                SelectAdvanceDiscountPolicy?.value ||
                advanceDiscountPolicies.find((item) => Number(item.value) === 0)?._id ||
                ""
            //console.log(data)
            const data1 = await createDataFunction("/Distrbutor", data)

            toast.success("Distrbutor Add")
            setTimeout(() => {
                navigate("/DistrbutorList")
            }, 2000);
        } catch (err) {
            toast.error("Something went wrong")
        }

    }
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
                                <label className="pd-label">Customer Name</label>
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

                            <div>
                                <label className="pd-label">Type</label>
                                <select
                                    className="pd-input"
                                    {...register("Type")}
                                    onChange={(e) => setDistributorType(e.target.value)}
                                >
                                    <option value="Cust">Customer</option>
                                    <option value="Distr">Distributor</option>
                                </select>
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
                                    value={SelectAdvanceDiscountPolicy || null}
                                    placeholder="Select..."
                                />
                            </div>
                            <div>
                                <label className="pd-label">Order Booker</label>
                                <AppSelect options={OrderBooker} onChange={(e) => setSelectedOrderBooker(e)} value={selectedOrderBooker} />
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
                                <label className="pd-label">City*</label>
                                <AppSelect options={AllCity} onChange={(e) => setSelectCity(e)} value={SelectCity} />
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
                                <label className="pd-label">TRP Type</label>
                                <select
                                    className="pd-input"
                                    {...register("TransportType")}
                                    onChange={(e) => setTransportType(e.target.value)}
                                >
                                    <option value="LTP">LTP</option>
                                    <option value="BTP">BTP</option>
                                </select>
                            </div>
                            <div>
                                <label className="pd-label">Select Transporter</label>
                                <AppSelect options={AllTransport} onChange={(e) => setSelectTransporter(e)} value={SelectTransporter} />
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
                            {DistributorType !== "Cust" ?
                                <>
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
                                            {...register("Password")}
                                            className="pd-input"

                                        />
                                    </div>
                                </>
                                : null
                            }
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
                                Add Distrbutor
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    )
}

export default DistrbutorAdd