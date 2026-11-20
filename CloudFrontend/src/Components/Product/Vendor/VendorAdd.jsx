import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';

const VendorAdd = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const navigate = useNavigate()
  const pageName = "VenderAdd"
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const Store = useSelector((state) => state.Store.Store)
  const [activeTab, setActiveTab] = useState('basic');
  const [changeStore , setChangeStore] = useState("")
  const [selectStore, setSelectStore] = useState("")
  const onSubmit = async (data) => {
    const lsstvedor = await getDataFundtion('/vendor/lastVendor')
    //console.log(lsstvedor.data.code)
    if (lsstvedor.data == null) {
      data.code = "01"
      //console.log(data)
      try {
        const res = await createDataFunction("/vendor", data)
        navigate("/VendorList")
        //console.log(res)
      } catch (err) {
        //console.log(err)
      }

    } else {
      try {
        data.code = generateNextCode(lsstvedor.data.code)
        //console.log(data)
        data.Store = selectStore
        const res = await createDataFunction("/vendor", data)
        toast.success("Data Add")
        setTimeout(() => {
          navigate("/VendorList")
        }, 2000);
        //console.log(data)
      } catch (err) {
        //console.log(err)
      }
    }

  }

  const StoreChnge = (id) => {
    setChangeStore(id)
    const values = (id || []).map(option => option.value);
    setSelectStore(values)
  }
  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == pageName)
    //console.log(allowAcess)
    if (!allowAcess) {
      navigate("/")
    }
  }

  const AllStore = Store.map((item) => {
    return {
      value: item._id,
      label: item.StoreName
    }
  })
  useEffect(() => {
    //checkAcess()
  }, [])
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Vendor</h1>
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
                  maxLength={5}
                  minLength={5}
                  {...register("ShortCode")}
                  className="pd-input"
                  required
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
                <label className="pd-label">sales Flow Ref</label>
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
                  required
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
                <label className="pd-label"> Vendor Store</label>
                <AppSelect isMulti value={changeStore} options={AllStore} placeholder={"Select Vendor Store"} onChange={(val) => StoreChnge(val)} />
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
                Add Vendor
              </button>
            )}
          </div>
        </form>
      </div>
    </div>

  )
}

export default VendorAdd

// <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
//             <button
//               type="submit"
//               className="pd-btn-save"
//             >
//               Add Vendor
//             </button>
//           </div>