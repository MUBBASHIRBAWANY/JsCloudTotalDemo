import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const isBossUser = (user) => user?.isBoss === true || user?.isBoss === "true";

const ProtectedRoute = ({ children, permission, requireBoss = false }) => {
  const UserRights = useSelector((state) => state.UsersRights.UserRights);
  const loginUser = useSelector((state) => state.LoginerReducer.userDetail);

  if (requireBoss && !isBossUser(loginUser)) {
    return <Navigate to="/unauthorized" />;
  }

  const hasAccess = UserRights.includes(permission);

  if (!hasAccess) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;