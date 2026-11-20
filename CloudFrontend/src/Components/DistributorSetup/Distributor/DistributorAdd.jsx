import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import { updateDate } from '../../Global/getDate';
import AppSelect from '../../Global/AppSelect.jsx'
import { createDataFunction } from '../../../Api/CRUDFunctions';


const DistributorAdd = () => {
  const navigate = useNavigate()
  const Distributor = useSelector((state) => state.LoginerReducer.DistributorDetail)
  const [selectedRole, setselectedRole] = useState()
  const [selectedLocation, setselectedLocation] = useState()
  const [selectedStore, setselectedStore] = useState()
  const [StoreDrp, setStoreDrp] = useState([])
  const [selectedVendor, setselectedVendor] = useState()
  const [DistributorType, DistributorType] = useState(false)
  const [Distributor, Distributor] = useState(1)

  Distributor.email
  const checkRight = () => {
    if (Distributor.email == "admin@js.com") {
      return null
    }
    else {
      navigate('/')
    }
  }

  useEffect(() => {
    checkRight()
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();
  let DistributorRole = useSelector((state) => state.DistributorsRole.state)
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

  if (DistributorType === true) {
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
    //console.log("Store dropdown updated for non-DistributorType");
  }
};

const setDrpSingle = (value) => {
    if (DistributorType == true) {
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
  let RoleDropDown = DistributorRole?.map((item) => {
    return { value: item._id, label: item.RoleName }
  })


  const onSubmit = async (data) => {
    //console.log(data)
    if (data.password != data.Cpassword) {
      return toast.error("pasword & confirm password should be same")
    }

    else {
      try {
        data.createdBy = Distributor.firstname
        data.createDate = updateDate()
        data.DistributorType = Distributor
        data.selectRole = selectedRole
        data.Location = Array.isArray(selectedLocation) ? selectedLocation : [selectedLocation]
        data.Store = Array.isArray(selectedStore) ? selectedStore : [selectedStore];
        data.Vendor = Array.isArray(selectedVendor) ? selectedVendor : [selectedVendor];
         //console.log(data)
         await createDataFunction('/Distributors', data)

        toast.success("Data Add")
        setTimeout(() => {
          navigate('/Distributorlist')
        }, 2000);
      } catch (err) {
        toast.error("First Name duplicate")
      }
    }

  };
  const SetMulti = (val) => {
    Distributor(val)
    if (val == 1) {
      DistributorType(false)
    }
    else {
      DistributorType(true)
    }
  }
  useEffect(() => {
    if (DistributorType) {
      setselectedStore([]);
      setselectedVendor([]);
    } else {
      setselectedStore("");
      setselectedVendor("");
    }
  }, [DistributorType]);
  return (
    <div>
      <div>
        <h1 className="pd-page-title text-center mb-6">Add Distributor</h1>
        <ToastContainer />
        <div>
          <form className="pd-form-grid mb-6" onSubmit={handleSubmit(onSubmit)}>

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
            
            <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
              <button
                type="submit"
                className="pd-btn-save"
              >
                Add Distributor
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


export default DistributorAdd