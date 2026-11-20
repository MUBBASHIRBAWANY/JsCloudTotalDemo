import AppButton, { PlusIcon } from '../../Components/Global/AppButton'
import UserRoleList from "../../Components/Users/UserRoleList/UserRoleList"

const userRoleListPage = () => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="pd-section-title">User Roles</h2>
        <div className="flex items-center gap-3">
          <AppButton to="/AddUserRolls" variant="outline" icon={<PlusIcon />}>
            Add
          </AppButton>
        </div>
      </div>
      <UserRoleList />
    </div>
  )
}

export default userRoleListPage