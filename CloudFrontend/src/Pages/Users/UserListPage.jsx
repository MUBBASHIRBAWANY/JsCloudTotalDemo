import React from 'react'
import UserList from "../../Components/Users/UserList/UserList"
import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import PasswordUpdate from '../../Components/Users/PasswordUpdate/PasswordUpdate'
import { useSelector } from 'react-redux'

const UserListPage = () => {
  const loginuser = useSelector((state)=> state.LoginerReducer.userDetail)
  
  return (
    <>
      {loginuser.email === "admin@js.com" ? (
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="pd-section-title">Users</h2>
            <div className="flex items-center gap-3">
              <AppButton to="/useradd" variant="outline" icon={<PlusIcon />}>
                Add
              </AppButton>
              <AppButton to="/MonthCloce" variant="outline" >
                Month Close
              </AppButton>
            </div>
          </div>
          <UserList />
        </div>
      ) : (
        <PasswordUpdate />
      )}
    </>
  )
}

export default UserListPage