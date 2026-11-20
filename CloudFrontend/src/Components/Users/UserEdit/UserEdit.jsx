
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDate } from '../../Global/getDate';
import AppSelect from '../../Global/AppSelect.jsx'
import { getDataFundtion, updateDataFunction } from '../../../Api/CRUDFunctions';
import { fetchUserRole } from '../../../Redux/Reducers/userRoleReduser';
import { isObject } from '@mui/x-data-grid/internals';


const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const loginuser = useSelector((state) => state.LoginerReducer.userDetail);
  const list1 = useSelector((state) => state.users1.state);
  const userRole = useSelector((state) => state.UsersRole.state);
  let Location = useSelector((state) => state.Location.Location)
  let Store = useSelector((state) => state.Store.Store)
  let Vendor = useSelector((state) => state.Vendor.state)
  const [UserYear, setUserYear] = useState([])
  const [finduser, setFinduser] = useState({});
  const [selectedRole, setSelectedRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [storeDrp, setStoreDrp] = useState([]);
  const [defultLocation, setDefultLocation] = useState([])
  const [section, setSection] = useState([])
  const [Subsection, setSubSection] = useState([])
  const [drpSubSection, setdrpSubSection] = useState([])
  const [userType, SetUserType] = useState(false)
  const [YearMonth, SetYearMonth] = useState([])
  const [selectedYear, setSelectedYear] = useState(null);
  const [userCloseMonth, setUserCloseMonth] = useState([]);
  const [chartofAccounts, setChartofAccounts] = useState([])
  const [selectedChartOfAccounts, setSelectedChartOfAccounts] = useState([])

  useEffect(() => {
    if (finduser?.userCloseMonth) {
      setUserCloseMonth(finduser.userCloseMonth);
    }
  }, [finduser]);
  const { register, handleSubmit, reset } = useForm();

  const checkRight = () => {

    if (loginuser.email !== "admin@js.com") {
      navigate('/');
    }
  };

  const LocationDrp = Location?.map((item) => {
    return { value: item._id, label: item.LocationName }
  })

  const VendorDrp = Vendor?.map((item) => {
    return { value: item._id, label: item.VendorName }
  })

  const secttionDrp = [
    { label: "Administrative", value: "Administrative" },
    { label: "Setup", value: "Setup" },
    { label: "Distributor", value: "Distributor" },
    { label: "Transactions", value: "Transactions" },
    { label: "Reports", value: "Reports" },
  ]


  const SubsecttionDrp = [
    { label: "User Setup", value: "UserSetup", secttion: "Setup" },
    { label: "Accounts Setup", value: "AccountsSetup", secttion: "Setup" },
    { label: "Product Setup", value: "ProductSetup", secttion: "Setup" },
    { label: "Customer", value: "Customer", secttion: "Setup" },
    { label: "Opening Balance", value: "OpeningBalance", secttion: "Setup" },
    { label: "Distributor Customers", value: "DistributorCustumers", secttion: "Distributor" },
  ]

  const getData = async () => {
    try {
      const data = await getDataFundtion("/Openinginventory/getAllYear")
      const YearValue = data.map((item) => ({
        label: `${item.DateStart} to ${item.DateEnd}`,
        DateStart: `${item.DateStart}`,
        DateEnd: `${item.DateEnd}`
      }))
      setUserYear(YearValue)
    } catch (err) {
      console.log(err)
    }
  }

  useEffect(() => {
    getData()
  }, [])

  useEffect(() => {
    if (userRole?.length) return
    const loadRoles = async () => {
      try {
        const res = await getDataFundtion('/userRole')
        const list = Array.isArray(res?.data) ? res.data : []
        dispatch(fetchUserRole(list))
      } catch (err) {
        console.error('Error fetching roles:', err)
      }
    }
    loadRoles()
  }, [dispatch])

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

    const selectedSubSection = SubsecttionDrp.filter(
      (item) => section.includes(item.secttion)
    )

    setdrpSubSection(selectedSubSection)

    // keep only valid old values
    setSubSection(prev =>
      prev.filter(v => selectedSubSection.some(opt => opt.value === v))
    )

  }, [section])
  const finddata = () => {
    //console.log(userType)
    if (!list1) {
      navigate("/userlist");
    } else {
      const data = list1.find((item) => item._id === id);
      setFinduser(data);

      if (data && userRole) {
        const matchedRole = userRole.find((val) => val._id === data.selectRole);
        if (matchedRole) {
          setSelectedRole({
            value: matchedRole._id,
            label: matchedRole.RoleName
          });
        }

        if (data.Vendor) {
          if (data.userType == 2) {
            SetUserType(true);

            const defultStoreValues = data.Store;
            setSelectedStore(defultStoreValues);

            const defultVendorValues = data.Vendor;
            setSelectedVendor(defultVendorValues);

            const defultSectionalues = data.Section;
            setSection(defultSectionalues);

            const defultSubSectionalues = data.Subsection;
            setSubSection(defultSubSectionalues);

            if (data.ChartOfAccounts) {
              setSelectedChartOfAccounts(data.ChartOfAccounts);
            }
          }
          else {
            const defultStore = Store.find((item) => item._id == data.Store[0])
            const defultStoreOption = {
              label: `${defultStore?.StoreName} ${defultStore?.code}`,
              value: defultStore?._id
            }
            setSelectedStore(defultStoreOption)

            const defultVendor = Vendor.find((item) => item._id == data?.Vendor[0])
            const defultVendorOption = {
              label: `${defultVendor?.VendorName} ${defultVendor?.code}`,
              value: defultVendor?._id
            }
            setSelectedVendor(defultVendorOption)
            const defultLocation = Location.find((item) => item._id == data.Location[0])
            const defultLocationOption = {
              label: defultLocation?.LocationName,
              value: defultLocation?._id

            }
            setDefultLocation(defultLocationOption)
          }

        }


        if (data.userType == 2) {
          const matchedLocation = Location.filter((item, index) => item._id == data.Location[index])
            .map((macthLoc) => macthLoc._id);
          //console.log(matchedLocation)
          setSelectedLocation(matchedLocation)
          const selectedLocationIds = data.Location;

          const filteredStores = Store.filter(store =>
            selectedLocationIds.includes(store.Location)
          );
          const store = filteredStores.map((item) => ({
            label: item.StoreName,
            value: item._id
          }))
          setStoreDrp(store)

        } else {
          const matchedLocation = Location.find((item) => item._id == data.Location);
          if (matchedLocation) {
            const locationOption = {
              value: matchedLocation._id,
              label: matchedLocation.LocationName
            }
            setSelectedLocation(locationOption.value);


            const storesForLocation = Store?.filter((item) => item.Location == data.Location).map((item) => {
              return { value: item._id, label: item.StoreName }
            });
            setStoreDrp(storesForLocation || []);
          }




        }

        if (data.Store) {
          const matchedStore = Store.filter((item) => data.Store);

          if (matchedStore) {
            const defaultStore = matchedStore.map((item) => {
              label: item.StoreName
              value: item._id
            })
            //console.log(defaultStore)

          }
        }
      }
      setIsLoading(false);
    }
  };

  useEffect(() => {
    finddata();
    checkRight();
  }, [id, list1, userRole]);





  const setDrpSingle = (value) => {
    //console.log(value);
    const values = value.value;

    setSelectedLocation(values);

    // Clear selected store first
    setSelectedStore([]); // or null based on your initial state

    // Now update store dropdown
    const updatedStoreDrp = Store?.filter(item => values.includes(item.Location))
      .map(item => ({
        value: item._id,
        label: item.StoreName,
      }));

    setStoreDrp(updatedStoreDrp);

    //console.log("Store dropdown updated for non-SetUserType");
  };


  const onSubmit = async (data) => {
    //console.log(selectedVendor)
    if (!selectedLocation || !selectedStore || !selectedVendor || !selectedVendor) {
      return toast.error("All DropDown Is Requried")
    }
    data.updateDate = updateDate();
    data.userCloseMonth = userCloseMonth;
    data.Location = Array.isArray(selectedLocation) ? selectedLocation : [selectedLocation];
    data.Store = Array.isArray(selectedStore) ? selectedStore : data.Store = [selectedStore.value];
    data.Vendor = Array.isArray(selectedVendor) ? selectedVendor : data.Vendor = [selectedVendor.value];
    data.selectRole = selectedRole ? selectedRole.value : null;
    data.ChartOfAccounts = selectedChartOfAccounts;
    data.Subsection = Array.isArray(Subsection) ? Subsection : data.Subsection = [Subsection.value];
    data.Section = Array.isArray(section) ? section : data.section = [section.value];
    console.log(data)
    try {
      const { confirmPassword, ...cleanData } = data;
      if (!cleanData.password || cleanData.password.trim() === "") {
        delete cleanData.password;
        delete cleanData.Cpassword;
      }
      console.log(cleanData)

      const res = await updateDataFunction(`/users/user/${id}`, cleanData)
      console.log(res)
      toast.success("User Updated Successfully");
      setTimeout(() => navigate('/userlist'), 1500);
    } catch (err) {
      toast.error("Error Updating User");
      console.error(err);
    }
  };

  const RoleDropDown = userRole?.map((item) => ({
    value: item._id,
    label: item.RoleName
  })) || [];

  const SelectYear = (year) => {
    setSelectedYear(year);

    const start = new Date(year.DateStart);
    const end = new Date(year.DateEnd);

    const months = [];
    let current = new Date(start);

    while (current <= end) {
      months.push({
        value: current.toLocaleString("default", {
          month: "long",
          year: "numeric"
        }),
        label: current.toLocaleString("default", {
          month: "long",
          year: "numeric"
        }),
        year: `${year.DateStart} to ${year.DateEnd}`
      });

      current.setMonth(current.getMonth() + 1);
    }

    SetYearMonth(months);
  };

  const handleCloseMonth = (selected) => {
    const yearKey = `${selectedYear.DateStart} to ${selectedYear.DateEnd}`;

    const months = selected.map(x => x.value);

    setUserCloseMonth(prev => {
      const exist = prev.find(x => x.year === yearKey);

      if (exist) {
        return prev.map(x =>
          x.year === yearKey
            ? { ...x, months }
            : x
        );
      }

      return [
        ...prev,
        {
          year: yearKey,
          months
        }
      ];
    });
  };
  const yearKey = selectedYear
    ? `${selectedYear.DateStart} to ${selectedYear.DateEnd}`
    : "";

  console.log(yearKey);

  console.log(userCloseMonth);
  const selectedMonths =
    userCloseMonth.find(
      x =>
        x.year ===
        `${selectedYear?.DateStart} to ${selectedYear?.DateEnd}`
    )?.months || [];

  const setDrp = (selectedValues) => {
    const values = selectedValues.map(item => item.value);

    setSelectedLocation(values);
    setSelectedStore([]);
    if (SetUserType === true) {
      const newStoreOptions = Store?.filter(item => values.includes(item.Location))
        .map(item => ({
          value: item._id,
          label: item.StoreName,
        }));

      setStoreDrp(newStoreOptions);
      setSelectedStore([]);
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
  if (isLoading) return <div className="text-center py-10">Loading User Data...</div>;
  return (
    <div className="pd-page">
      <div>
        <h1 className="pd-page-title text-center">Add User</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid" onSubmit={handleSubmit(onSubmit)}>

            <div className="mb-4">
              <label className="pd-label">First Name</label>
              <input
                type="text"
                defaultValue={finduser.firstname}
                {...register("firstname")}
                className="pd-input"
                required
              />
            </div>

            <div className="mb-4">
              <label className="pd-label">Last Name</label>
              <input
                type="text"
                defaultValue={finduser.lastname}
                {...register("lastname")}
                className="pd-input"
                required
              />
            </div>
            <div className="mb-4">
              <label className="pd-label">Phone Number</label>
              <input
                type="text"
                defaultValue={finduser.phoneNumber}
                {...register("phoneNumber")}
                className="pd-input"
                required
              />
            </div>
            <div className="mb-4">
              <label className="pd-label">Password</label>
              <input

                {...register("password")}
                className="pd-input"
                placeholder="Leave blank to keep current"
              />
            </div>

            <div className="mb-4">
              <label className="pd-label">Confirm Password</label>
              <input

                {...register("Cpassword")}
                className="pd-input"
                placeholder="Leave blank to keep current"
              />
            </div>
            <div className="mb-4">
              <label className="pd-label">User Role</label>
              <AppSelect
                value={selectedRole}
                onChange={setSelectedRole}
                options={RoleDropDown}
              />
            </div>
            <div>
              <label className="pd-label">User Type </label>
              <select {...register("userType")}
                defaultValue={finduser.userType}
                disabled={true}
                style={{ backgroundColor: 'lightgray' }}
                className="pd-input" name="" id="">
                <option value="1">Kpo</option>
                <option value="2">User</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="pd-label">Location</label>
              {userType ? (
                <AppSelect
                  isMulti
                  onChange={(val) => setDrp(val)}
                  options={LocationDrp}
                  defaultValue={LocationDrp.filter(opt => selectedLocation?.includes(opt.value))}
                />
              ) : (<AppSelect
                onChange={(val) => setDrpSingle(val)}
                options={LocationDrp}
                defaultValue={defultLocation}
              />)
              }

            </div>

            <div className="mb-4">
              <label className="pd-label">Department</label>
              {userType ? (
                <AppSelect
                  isMulti
                  options={storeDrp}
                  value={storeDrp.filter(opt => selectedStore?.includes(opt.value))}
                  onChange={(val) => setSelectedStore(val?.map(v => v.value) || [])}
                />
              ) : (
                <AppSelect
                  onChange={(val) => setSelectedStore(val || [])}
                  options={storeDrp}
                  value={selectedStore}
                  isClearable
                />
              )}
            </div>

            <div className="mb-4">
              <label className="pd-label">Vendor</label>
              {userType ? (
                <AppSelect
                  isMulti
                  defaultValue={VendorDrp.filter(opt => selectedVendor?.includes(opt.value))}
                  onChange={(val) => setSelectedVendor(val?.map(v => v.value) || [])}
                  options={VendorDrp}
                />
              ) : (<AppSelect onChange={(val) => setSelectedVendor(val)} options={VendorDrp}
                value={selectedVendor} />)}
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
              <label className="pd-label">Sub Sections</label>
              <AppSelect
                isMulti
                onChange={(val) => setSubSection(val?.map(v => v.value) || [])}
                options={drpSubSection}
                value={drpSubSection.filter(opt => Subsection.includes(opt.value))}
              />


            </div>
            <div>
              <label className="pd-label">Select Year</label>
              <AppSelect
                onChange={(val) => SelectYear(val)}
                options={UserYear}
                YearMonth
              />


            </div>

            <div>
              <label className="pd-label">Close Month</label>
              <AppSelect
                options={YearMonth}
                isMulti
                value={YearMonth.filter(item =>
                  selectedMonths.includes(item.value)
                )}
                onChange={handleCloseMonth}
              />


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
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end mt-6">
              <button
                type="submit"
                className="pd-btn-save"
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