import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ component: Component }) => {
  const { isAuthenticated, user } = useAuth();

  // ✅ Fix: Use existing isAdmin from context instead of re-declaring
  if (isAuthenticated && user?.role === "admin") {
    return <Component />;
  } else {
    return <Navigate to="/login" />;
  }
};

export default AdminRoute;
