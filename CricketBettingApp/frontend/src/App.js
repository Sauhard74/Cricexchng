import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Header from "./components/Header";
import Footer from "./components/Footer";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MatchDetailsPage from "./pages/MatchDetailsPage";
import BettingPage from "./pages/BettingPage";
import ProfilePage from "./pages/ProfilePage";
import BetsPage from "./pages/BetsPage";
import AdminDashboard from "./pages/AdminDashboard";
import UsersPage from "./pages/UsersPage";
import CreditRequestsPage from "./pages/CreditsRequestsPage";

import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import './index.css';

function App() {
  const { isAuthenticated, isAdmin } = useAuth(); // ✅ Fix Destructuring

  console.log("✅ isAdmin:", isAdmin);

  return (
    <Router>
      <div className="app-container">
        <Header />
        <Routes>
          {/* ✅ Public Routes */}
          <Route path="/" element={isAuthenticated ? (isAdmin ? <Navigate to="/admin/dashboard" /> : <Navigate to="/home" />) : <Navigate to="/login" />} />
          <Route path="/login" element={!isAuthenticated ? <LoginPage /> : <Navigate to={isAdmin ? "/admin/dashboard" : "/home"} />} />
          <Route path="/register" element={!isAuthenticated ? <RegisterPage /> : <Navigate to={isAdmin ? "/admin/dashboard" : "/home"} />} />

          {/* ✅ User Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/match/:matchId" element={<MatchDetailsPage />} />
            <Route path="/betting/:matchId/*" element={<BettingPage />} />
            <Route path="/bets" element={<BetsPage />} />
          </Route>

          {/* ✅ Admin Routes */}
          {isAdmin && (
            <>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/credit-requests" element={<CreditRequestsPage />} />
            </>
          )}
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
