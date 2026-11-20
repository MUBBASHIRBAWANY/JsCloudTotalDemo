import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDate } from '../../Global/getDate';
import Select from 'react-select';
import { getDataFundtion, updateDataFunction } from '../../../Api/CurdFunctions';
import { fetchDistributroReducers } from '../../../Redux/Reducers/DistributroReducers';
import { fetchUsers } from '../../../Redux/Reducers/userReduser';
import { ALL_DISTRIBUTORS } from '../../Global/distributorAccess';

const ALL_OPTION = { value: ALL_DISTRIBUTORS, label: 'All Distributors' };

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const list1 = useSelector((state) => state.users1.state);
  const Distributors = useSelector((state) => state.DistributroReducers.DistributroReducers);

  const [finduser, setFinduser] = useState({});
  const [selectedDistributors, setSelectedDistributors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const { register, handleSubmit } = useForm();

  const checkRight = () => {
    if (loginuser.email !== "admin@js.com") {
      navigate('/');
    }
  };

  useEffect(() => {
    getDataFundtion("/Distrbutor")
      .then((data) => dispatch(fetchDistributroReducers(data)))
      .catch((err) => console.log(err));
  }, []);

  const DistributorDrp = [
    ALL_OPTION,
    ...(Distributors?.map((item) => ({
      value: item._id,
      label: item.DistrbutorName,
    })) || []),
  ];

  const handleDistributorChange = (selected) => {
    const values = selected || [];
    if (!values.length) {
      setSelectedDistributors([]);
      return;
    }
    const addedAll = values[values.length - 1]?.value === ALL_DISTRIBUTORS;
    if (addedAll) {
      setSelectedDistributors([ALL_OPTION]);
      return;
    }
    setSelectedDistributors(values.filter((item) => item.value !== ALL_DISTRIBUTORS));
  };

  const loadUser = async () => {
    // Use the user list from redux if available, otherwise fetch it
    let data = list1?.find((item) => item._id === id);
    if (!data) {
      try {
        const res = await getDataFundtion("/users");
        const users = res?.data || res || [];
        data = users.find((item) => item._id === id);
        dispatch(fetchUsers(users));
      } catch (err) {
        console.log(err);
      }
    }

    setFinduser(data || {});
    setIsLoading(false);

    if (data) {
      const vendorIds = Array.isArray(data.Vendor) && data.Vendor.length
        ? data.Vendor
        : (data.distributor ? [data.distributor] : []);
      if (vendorIds.some((item) => String(item).toLowerCase() === ALL_DISTRIBUTORS)) {
        setSelectedDistributors([ALL_OPTION]);
      } else if (Distributors?.length) {
        setSelectedDistributors(
          vendorIds
            .map((vendorId) => {
              const matched = Distributors.find((item) => item._id === vendorId);
              return matched ? { value: matched._id, label: matched.DistrbutorName } : null;
            })
            .filter(Boolean)
        );
      }
    }
  };

  useEffect(() => {
    loadUser();
    checkRight();
  }, [id, list1, Distributors]);

  const onSubmit = async (data) => {
    if (!selectedDistributors.length) {
      return toast.error("Please Select Distributor");
    }
    const vendorIds = selectedDistributors.map((item) => item.value);
    data.updateDate = updateDate();
    data.Vendor = vendorIds;
    data.distributor = vendorIds.includes(ALL_DISTRIBUTORS) ? ALL_DISTRIBUTORS : vendorIds[0];

    try {
      await updateDataFunction(`/users/user/${id}`, data)
      toast.success("User Updated Successfully");
      setTimeout(() => navigate('/userlist'), 1500);
    } catch (err) {
      toast.error("Error Updating User");
      console.error(err);
    }
  };

  if (isLoading) return <div className="text-center py-10">Loading User Data...</div>;

  return (
    <div>
      <div>
        <h1 className="text-3xl font-bold text-center  text-gray-800 mb-6">Edit User</h1>
        <ToastContainer />
        <div>
          <form className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-white p-6 rounded-lg shadow-md mb-6" onSubmit={handleSubmit(onSubmit)}>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">First Name</label>
              <input
                type="text"
                defaultValue={finduser.firstname}
                {...register("firstname")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Last Name</label>
              <input
                type="text"
                defaultValue={finduser.lastname}
                {...register("lastname")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Phone Number</label>
              <input
                type="text"
                defaultValue={finduser.phoneNumber}
                {...register("phoneNumber")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Password</label>
              <input
                {...register("password")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank to keep current"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Confirm Password</label>
              <input
                {...register("Cpassword")}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank to keep current"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Distributor</label>
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

            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200"
              >
                Update User
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default UserEdit
