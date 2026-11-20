import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDate } from '../../Global/getDate';
import Select from 'react-select'
import { createDataFunction, getDataFundtion } from '../../../Api/CurdFunctions';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';
import { ALL_DISTRIBUTORS } from '../../Global/distributorAccess';

const ALL_OPTION = { value: ALL_DISTRIBUTORS, label: 'All Distributors' }

const UserAdd = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers)
  const [selectedDistributors, setSelectedDistributors] = useState([])

  const checkRight = () => {
    if (loginuser.email == "admin@js.com") {
      return null
    }
    else {
      navigate('/')
    }
  }

  useEffect(() => {
    checkRight()
    getDataFundtion("/Distrbutor")
      .then((data) => dispatch(fetchDistributroReducers(data)))
      .catch((err) => console.log(err))
  }, [])

  const {
    register,
    handleSubmit,
  } = useForm();

  const DistributorDrp = [
    ALL_OPTION,
    ...(Distributors || []).map((item) => ({
      value: item._id,
      label: item.DistrbutorName,
    })),
  ]

  const handleDistributorChange = (selected) => {
    const values = selected || []
    if (!values.length) {
      setSelectedDistributors([])
      return
    }
    const addedAll = values[values.length - 1]?.value === ALL_DISTRIBUTORS
    if (addedAll) {
      setSelectedDistributors([ALL_OPTION])
      return
    }
    setSelectedDistributors(values.filter((item) => item.value !== ALL_DISTRIBUTORS))
  }

  const onSubmit = async (data) => {
    if (!selectedDistributors.length) {
      return toast.error("Please Select Distributor")
    }
    if (data.password != data.Cpassword) {
      return toast.error("pasword & confirm password should be same")
    }

    try {
      const vendorIds = selectedDistributors.map((item) => item.value)
      data.createdBy = loginuser.firstname
      data.createDate = updateDate()
      data.Vendor = vendorIds
      data.distributor = vendorIds.includes(ALL_DISTRIBUTORS) ? ALL_DISTRIBUTORS : vendorIds[0]
      data.Location = []
      data.Store = []
      data.userType = "2"
      await createDataFunction('/users', data)

      toast.success("Data Add")
      setTimeout(() => {
        navigate('/userlist')
      }, 2000);
    } catch (err) {
      toast.error("First Name duplicate")
    }
  };

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-center  text-gray-800 mb-6">Add User</h1>
        <ToastContainer />
        <div>
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">First Name</label>
              <input
                type="text"
                {...register("firstname")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Last Name</label>
              <input
                type="text"
                {...register("lastname")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Phone Number</label>
              <input
                type="text"
                {...register("phoneNumber")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Password </label>
              <input
                type="text"
                {...register("password")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Confirm Password </label>
              <input
                type="text"
                {...register("Cpassword")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">Distributor </label>
              <Select
                isMulti
                value={selectedDistributors}
                onChange={handleDistributorChange}
                options={DistributorDrp}
                placeholder="Select Distributor(s)"
                closeMenuOnSelect={false}
              />
              <p className="text-xs text-gray-500 mt-1">Select All to give access to every distributor</p>
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


export default UserAdd
