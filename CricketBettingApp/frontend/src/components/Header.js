import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/components/Header.css";

const Header = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  // ✅ Logout Handler
  const handleLogout = async () => {
    await logout();
    navigate("/"); // ✅ Redirect to home after logout
  };

  return (
    <header className="header">
      <div className="container">
        {/* ✅ Logo */}
        <Link
          to="/"
          className="logo"
          onClick={(e) => {
            if (isAuthenticated) {
              e.preventDefault();
              navigate("/home");
            }
          }}
        >
          🏏 Cricket Betting
        </Link>

        {/* ✅ Navigation */}
        <nav>
          <ul className="nav-links">
            {/* ✅ Home */}
            <li>
              <Link
                to="/"
                onClick={(e) => {
                  if (isAuthenticated) {
                    e.preventDefault();
                    navigate("/home");
                  }
                }}
              >
                Home
              </Link>
            </li>

            {isAuthenticated ? (
              <>
                {/* ✅ Admin Dashboard */}
                {isAdmin && (
                  <li>
                    <Link to="/admin/dashboard">🏆 Dashboard</Link>
                  </li>
                )}

                {/* ✅ Profile */}
                <li>
                  <Link to="/profile">👤 {user?.username}</Link>
                </li>

                {/* ✅ Logout */}
                <li>
                  <button className="logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                {/* ✅ Login & Register */}
                <li>
                  <Link to="/login">Login</Link>
                </li>
                <li>
                  <Link to="/register">Register</Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </header>
  );
};

export default Header;
