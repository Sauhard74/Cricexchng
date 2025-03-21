import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/components/Header.css";
import { useState, useEffect, useRef } from 'react';

const Header = () => {
  const { isAuthenticated, user, logout, isAdmin, updateUserData } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const mobileMenuRef = useRef(null);

  // Refresh user data when component mounts
  useEffect(() => {
    if (isAuthenticated) {
      updateUserData();
    }
  }, [isAuthenticated, updateUserData]);

  // ✅ Logout Handler
  const handleLogout = () => {
    logout();
    navigate("/"); // ✅ Redirect to home after logout
    setIsUserDropdownOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get display name with fallback
  const displayName = user?.name || (user?.username ? user.username : 'User');

  return (
    <header className="header">
      <div className="header-container">
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
          <span className="logo-icon">🏏</span>
          <span className="logo-text">CricketBets</span>
        </Link>

        {/* Mobile Menu Toggle */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        {/* Main Navigation */}
        <nav className={`main-nav ${isMobileMenuOpen ? 'mobile-open' : ''}`} ref={mobileMenuRef}>
          <ul className="nav-links">
            {/* ✅ Home */}
            <li>
              <Link
                to="/"
                className="nav-link"
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
             
            <li className="dropdown">
              <button className="nav-link dropdown-toggle">
                Sports <i className="dropdown-icon">▼</i>
              </button>
              <ul className="dropdown-menu">
                <li><Link to="/cricket/t20">T20 Cricket</Link></li>
                <li><Link to="/cricket/odi">ODI Cricket</Link></li>
                <li><Link to="/cricket/test">Test Cricket</Link></li>
                <li><Link to="/cricket/leagues">Leagues</Link></li>
              </ul>
            </li>
           
            {isAdmin && (
              <li>
                <Link to="/admin/dashboard" className="nav-link admin-link">Admin</Link>
              </li>
            )}
          </ul>
        </nav>

        {/* User Actions */}
        <div className="user-actions">
          {isAuthenticated ? (
            <div className="user-profile-dropdown" ref={userDropdownRef}>
              <button 
                className="user-profile-button"
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
              >
                <div className="user-avatar">
                  {displayName.charAt(0) || 'U'}
                </div>
                <span className="user-name">{displayName}</span>
                <i className="dropdown-icon">▼</i>
              </button>
              
              {isUserDropdownOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <div className="user-info">
                      <span className="user-greeting">Welcome,</span>
                      <span className="user-full-name">{displayName}</span>
                      <span className="user-balance">Balance: ₹{user?.credits?.toFixed(2) || '0.00'}</span>
                    </div>
                  </div>
                  <ul className="user-dropdown-links">
                    <li>
                      <Link to="/profile" onClick={() => setIsUserDropdownOpen(false)}>
                        <i className="menu-icon profile-icon">👤</i> My Profile
                      </Link>
                    </li>
                    <li>
                      <Link to="/bets" onClick={() => setIsUserDropdownOpen(false)}>
                        <i className="menu-icon bets-icon">🎯</i> My Bets
                      </Link>
                    </li>
                   
                    {isAdmin && (
                      <li>
                        <Link to="/admin/dashboard" onClick={() => setIsUserDropdownOpen(false)}>
                          <i className="menu-icon admin-icon">⚙️</i> Admin Dashboard
                        </Link>
                      </li>
                    )}
                    <li className="divider"></li>
                    <li>
                      <button onClick={handleLogout} className="logout-button">
                        <i className="menu-icon logout-icon">🚪</i> Logout
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-button">Login</Link>
              <Link to="/register" className="register-button">Register</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
