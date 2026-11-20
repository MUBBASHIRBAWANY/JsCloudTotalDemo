import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { ToastContainer, toast } from 'react-toastify';
import { generateNextCode } from '../../Global/GenrateCode';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Select from 'react-select'
import { createDataFunction, getDataFundtion } from '../../../Api/CurdFunctions';

const VendorAdd = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  const navigate = useNavigate()
  const pageName = "Add Vendor"
  const UserRihts = useSelector((state) => state.UsersRights.UserRights)
  const Store = useSelector((state) => state.Store.Store)
  const [activeTab, setActiveTab] = useState('basic');
  const [changeStore, setChangeStore] = useState("")
  const [selectStore, setSelectStore] = useState("")
  const [vendorAccouts, serVendorAccouts] = useState('')
  const Account = useSelector((state) => state.ChartofAccounts.ChartofAccounts)
  console.log(Account)

  const filteredAccount = Account.filter((item) => item.AccountCode.length === 5)
  const VendorAccountNumber = useSelector((state) => state.AdminReducer.AdminReducer)



  const result = [];
  for (let i = VendorAccountNumber.VendorFrom; i <= VendorAccountNumber.VendorFrom; i++) {
    result.push(i.toString().padStart(5, '0'));
  }


  const venodrSeries = filteredAccount.filter((item) => result.some(prefix => item.AccountCode.startsWith(prefix)))

  const onSubmit = async (data) => {


    data.Stage3 = vendorAccouts.value
    data.Stage = "4"
    data.AccountName = data.VendorName
    data.masterCode = Account.find((item) => item._id == vendorAccouts.value).AccountCode
    data.Stage1 = Account.find((item) => item._id == vendorAccouts.value).Stage1
    data.Stage2 = Account.find((item) => item._id == vendorAccouts.value).Stage2
    const lsstvedor = await getDataFundtion('/vendor/lastVendor')
    console.log(lsstvedor)
    if (lsstvedor.data == null) {
      data.code = "01"
      data.Store = selectStore
      console.log(data)
      try {
        const createAccout = await createDataFunction('/ChartofAccounts', data)
        data.AccountCode = createAccout.data.AccountCode
        const res = await createDataFunction("/vendor", data)
        console.log(res)
        toast.success("vendor Add Successfully")
        setTimeout(() => {
          navigate("/VendorList")
        }, 1000)

      } catch (err) {
        toast.error("Some Thing Went Wrong")
      }

    } else {
      try {
        data.code = generateNextCode(lsstvedor.data.code)
        console.log(data)
        data.Store = selectStore
        const createAccout = await createDataFunction('/ChartofAccounts', data)
        data.AccountCode = createAccout.data.AccountCode
        const res = await createDataFunction("/vendor", data)
        toast.success("Data Add")
        setTimeout(() => {
          navigate("/VendorList")
        }, 2000);
        console.log(data)
      } catch (err) {
        toast.error("Some Thing Went Wrong")
      }
    }

  }

  const VedorSeriesDrp = venodrSeries.map((item) => ({
    value: item._id,
    label: `${item.AccountCode} ${item.AccountName}`
  }))

  const StoreChnge = (id) => {
    setChangeStore(id)
    const values = (id || []).map(option => option.value);
    setSelectStore(values)
  }
  const checkAcess = async () => {
    const allowAcess = await UserRihts.find((item) => item == pageName)
    console.log(allowAcess)
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
  // useEffect(() => {
  //   checkAcess()
  // }, [])
  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Add Vendor</h1>
        <ToastContainer />

        <form className="bg-white p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>
          {/* Basic Info Tab */}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Vendor Series Account</label>
              <Select options={VedorSeriesDrp} onChange={(e) => serVendorAccouts(e)} />
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

export default VendorAdd

