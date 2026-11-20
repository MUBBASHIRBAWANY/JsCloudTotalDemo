import AppSelect from '../../Global/AppSelect.jsx'
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDataFunction } from '../../Api/CRUDFunctions';


const DistributorOrderBookerEdit = () => {
 const { id } = useParams()
     const editOrderBooker = useSelector((state) => state.OrderBooker.OrderBooker)
     const Vendor = useSelector((state) => state.Vendor.state)
     const [editCat, seteditCat] = useState([])
     const [vendorSelect, setSelectVendor] = useState(undefined)
     const getData = () => {
         const data = editOrderBooker.find((item) => item._id == id)
         //console.log(data)
         seteditCat(data)
         const selectVen = Vendor.find((item) => item._id == data.Vendor)
         //console.log(selectVen)
         setSelectVendor({
             value: selectVen._id,
             label: `${selectVen.VendorName} ${selectVen.code} `
         })
         if (data) {
             reset({
                 OrderBookerName: data.OrderBookerName,
                 salesFlowRef : data.salesFlowRef,
                 Address : data.Address,
                 Cnic : data.Cnic,
                 PhoneNumber : data.PhoneNumber
             })
         }
 
     }
     const UserRihts = useSelector((state) => state.UsersRights.UserRights)
     const pageName = "OrderBookerEdit"
     const checkAcess = async () => {
         //console.log(UserRihts)
         const allowAcess = await UserRihts.find((item) => item == pageName)
         //console.log(allowAcess)
         if (!allowAcess) {
             navigate("/")
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
             updateDataFunction(`/OrderBooker/updateOrderBooker/${id}`, data)
             toast.success("Data Edit")
             setTimeout(() => {
                 navigate('/OrderBookerList')
             }, 2000);
         } catch (err) {
             //console.log(err)
         }
     }
       const Vendordrp = Vendor.map((item) => {
    return { value: item._id, label: `${item.VendorName} (${item.code})` }
  })
     return (
         <div className='mx-5'>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Order Booker</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid lg:grid-cols-4 mb-6" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="pd-label">Order Booker Name </label>
              <input
                type="text"
                {...register("OrderBookerName")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Sales Flow Ref </label>
              <input
                type="text"
                {...register("salesFlowRef")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Vendor </label>
              <AppSelect isDisabled={true} value={vendorSelect} onChange={(val) => setPrVendor(val.value)} options={Vendordrp} />
            </div>
            <div>
              <label className="pd-label">Address </label>
              <input
                type="text"
                {...register("Address")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Cnic </label>
              <input
                type="text"
                {...register("Cnic")}
                className="pd-input"
              />
            </div>
            <div>
              <label className="pd-label">Phone Number </label>
              <input
                type="text"
                {...register("PhoneNumber")}
                className="pd-input"
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Edit Order Booker
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DistributorOrderBookerEdit