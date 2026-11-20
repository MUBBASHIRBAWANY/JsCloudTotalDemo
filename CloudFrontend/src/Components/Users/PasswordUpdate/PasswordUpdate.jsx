import axios from 'axios';
import React from 'react'
import { useForm } from 'react-hook-form';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { updateDataFunction } from '../../../Api/CRUDFunctions';

const PasswordUpdate = () => {
  const navigate = useNavigate();
const loginuser = useSelector((state)=> state.LoginerReducer.userDetail)


  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  const onSubmit = async (data) => {
    data.updatedBy = loginuser.firstname
    const id = loginuser._id
    //console.log(data)
    const res = await updateDataFunction(`/users/user/${id}` , data)
    //console.log(res)

  };

  return (
    <div>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="pd-form-grid"
      >
        <div className="col-span-1 md:col-span-2 lg:col-span-3">
          <label className="pd-label">Password</label>
          <input
            type="text"
            {...register("password", { required: true })}
            className="pd-input"
          />
          {errors.password && <p className="text-error text-sm mt-1">Password is required.</p>}
        </div>

        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-end">
          <button
            type="submit"
            className="pd-btn-save"
          >
            Edit User
          </button>
        </div>
      </form>
    </div>
  );
};

export default PasswordUpdate;
