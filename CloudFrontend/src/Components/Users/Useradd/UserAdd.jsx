import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDate } from '../../Global/getDate';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction, getDataFundtion } from '../../../Api/CRUDFunctions';
import { fetchUserRole } from '../../../Redux/Reducers/userRoleReduser';


const UserAdd = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail)
  const [selectedRole, setselectedRole] = useState()
  const [roleOptions, setRoleOptions] = useState([])
  const [selectedLocation, setselectedLocation] = useState()
  const [selectedStore, setselectedStore] = useState()
  const [StoreDrp, setStoreDrp] = useState([])
  const [selectedVendor, setselectedVendor] = useState()
  const [userType, SetUserType] = useState(false)
  const [section, setSection] = useState([])
  const [user, setUser] = useState(1)
  const [chartofAccounts, setChartofAccounts] = useState([])
  const [selectedChartOfAccounts, setSelectedChartOfAccounts] = useState([])

  loginuser.email
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
  })

  useEffect(() => {
    const fetchChartOfAccounts = async () => {
      try {
        const res = await getDataFundtion('/chartofaccounts/Stage4');
        const options = res.data.map((item) => ({
          value: item._id,
          label: `${item.AccountName} (${item.AccountCode})`
        }));
        setChartofAccounts(options);
      } catch (err) {
        console.error('Error fetching Chart of Accounts:', err);
      }
    };
    fetchChartOfAccounts();
  }, [])

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await getDataFundtion('/userRole');
        const list = Array.isArray(res?.data) ? res.data : [];
        dispatch(fetchUserRole(list));
        setRoleOptions(list.map((item) => ({
          value: item._id,
          label: item.RoleName,
        })));
      } catch (err) {
        console.error('Error fetching roles:', err);
        toast.error('User roles load nahi hue');
      }
    };
    fetchRoles();
  }, [dispatch])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  let Location = useSelector((state) => state.Location.Location)
  let Store = useSelector((state) => state.Store.Store)
  let Vendor = useSelector((state) => state.Vendor.state)

  const LocationDrp = Location?.map((item) => {
    return { value: item._id, label: item.LocationName }
  })

  const VendorDrp = Vendor?.map((item) => {
    return { value: item._id, label: item.VendorName }
  })
  const setDrp = (selectedValues) => {
    const values = selectedValues.map(item => item.value);

    setselectedLocation(values);

    if (SetUserType === true) {
      const newStoreOptions = Store?.filter(item => values.includes(item.Location))
        .map(item => ({
          value: item._id,
          label: item.StoreName,
        }));

      setStoreDrp(newStoreOptions);
      setselectedStore([]); // reset store selection
    } else {
      const storeDrp = Store?.filter(item => values.includes(item.Location))
        .map(item => ({
          value: item._id,
          label: item.StoreName,
        }));

      setStoreDrp(storeDrp);
      //console.log("Store dropdown updated for non-SetUserType");
    }
  };

  const secttionDrp = [
    { label: "Setup", value: "Setup" },
    { label: "Administrative", value: "Administrative" },
    { label: "Distributor", value: "Distributor" },
    { label: "Transactions", value: "Transactions" },
    { label: "Reports", value: "Reports" },
  ]

  const setDrpSingle = (value) => {
    if (SetUserType == true) {
      setselectedLocation(value);
      const newStoreOptions = Store?.filter((item) => item.Location === value)
        .map((item) => ({
          value: item._id,
          label: item.StoreName,
        }));
      setStoreDrp(newStoreOptions);
      setselectedStore([]);
    }
    else {
      setselectedLocation(value)
      const StoreDrp = Store?.filter((item) => item.Location == value).map((item) => {
        return { value: item._id, label: item.StoreName }
      })
      setStoreDrp(StoreDrp)
    }

  }
  const onSubmit = async (data) => {
    //console.log(data)
    if (data.password != data.Cpassword) {
      return toast.error("pasword & confirm password should be same")
    }
    if (!selectedRole) {
      return toast.error("User Role select karo")
    }

    else {
      try {
        data.createdBy = loginuser.firstname
        data.createDate = updateDate()
        data.userType = user
        data.Section = section
        data.selectRole = selectedRole
        data.Location = Array.isArray(selectedLocation) ? selectedLocation : [selectedLocation]
        data.Store = Array.isArray(selectedStore) ? selectedStore : [selectedStore];
        data.Vendor = Array.isArray(selectedVendor) ? selectedVendor : [selectedVendor];
        data.ChartOfAccounts = selectedChartOfAccounts;
        //console.log(data)
        await createDataFunction('/users', data)

        toast.success("Data Add")
        setTimeout(() => {
          navigate('/userlist')
        }, 2000);
      } catch (err) {
        toast.error("First Name duplicate")
      }
    }

  };
  const SetMulti = (val) => {
    setUser(val)
    if (val == 1) {
      SetUserType(false)
    }
    else {
      SetUserType(true)
    }
  }
  useEffect(() => {
    if (userType) {
      setselectedStore([]);
      setselectedVendor([]);
    } else {
      setselectedStore("");
      setselectedVendor("");
    }
  }, [userType]);
  return (
    <div className="pd-page">
      <div>
        <h1 className="pd-page-title text-center">Add User</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid" onSubmit={handleSubmit(onSubmit)}>

            <div>
              <label className="pd-label">First Name</label>
              <input
                type="text"
                {...register("firstname")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Last Name</label>
              <input
                type="text"
                {...register("lastname")}
                className="pd-input"
                required
              />
            </div>
            <div>

              <label className="pd-label">Phone Number</label>
              <input
                type="text"
                {...register("phoneNumber")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Password </label>
              <input
                type="text"
                {...register("password")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">Confirm Password </label>
              <input
                type="text"
                {...register("Cpassword")}
                className="pd-input"
                required
              />
            </div>
            <div>
              <label className="pd-label">User Role </label>
              <AppSelect
                onChange={(val) => setselectedRole(val?.value)}
                options={roleOptions}
                placeholder="Select role"
              />
            </div>
            <div>
              <label className="pd-label">User Type </label>
              <select {...register("userType")} onChange={(e) => SetMulti(e.target.value)} className="pd-input" name="" id="">
                <option value="1">Kpo</option>
                <option value="2">User</option>
              </select>
            </div>
            <div>
              <label className="pd-label">Location</label>
              {userType ? (
                <AppSelect
                  isMulti
                  onChange={(val) => setDrp(val)}
                  options={LocationDrp}
                />
              ) : (<AppSelect
                onChange={(val) => setDrpSingle(val.value)}
                options={LocationDrp}
              />)
              }
            </div>

            <div>
              <label className="pd-label">Department</label>

              {userType ? (
                <AppSelect
                  isMulti
                  onChange={(val) => setselectedStore(val?.map(v => v.value) || [])}
                  options={StoreDrp}
                  value={StoreDrp.filter(opt => selectedStore.includes(opt.value))}
                />
              ) : (
                <AppSelect
                  onChange={(val) => setselectedStore(val.value)}
                  options={StoreDrp}
                  value={StoreDrp.find(opt => opt.value === selectedStore) || null}
                />
              )}
            </div>
            <div>
              <label className="pd-label">Section</label>
              <AppSelect
                isMulti
                onChange={(val) => setSection(val?.map(v => v.value) || [])}
                options={secttionDrp}
                value={secttionDrp.filter(opt => section.includes(opt.value))}
              />

            </div>
            <div>
              <label className="pd-label">Vendor </label>

              {userType ? (
                <AppSelect
                  isMulti
                  onChange={(val) => setselectedVendor(val?.map(v => v.value) || [])}
                  options={VendorDrp}
                  value={VendorDrp.filter(opt => selectedVendor?.includes(opt?.value))} />
              ) :
                (<AppSelect onChange={(val) => setselectedVendor(val.value)} options={VendorDrp}
                  value={VendorDrp.find(opt => opt.value === selectedVendor) || null} />)}
            </div>
            <div>
              <label className="pd-label">Chart of Accounts</label>
              <AppSelect
                isMulti
                onChange={(val) => setSelectedChartOfAccounts(val?.map(v => v.value) || [])}
                options={chartofAccounts}
                value={chartofAccounts.filter(opt => selectedChartOfAccounts.includes(opt.value))}
                placeholder="Select Chart of Accounts"
              />
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
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