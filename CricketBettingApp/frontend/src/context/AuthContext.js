import { createContext, useContext, useState, useEffect } from 'react';
import { loginUser, logoutUser, getProfile } from '../api/authService';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState(
    Boolean(localStorage.getItem('token'))
  );

  // ✅ Fix: Read from localStorage on refresh
  const [isAdmin, setIsAdmin] = useState(() => {
    const role = localStorage.getItem('role');
    console.log('Setting initial isAdmin:', role === 'admin');
    return role === 'admin';
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log('Fetching user profile...');
        const profile = await getProfile();

        console.log('Profile loaded:', profile);

        if (profile && profile.role) {
          setUser(profile);
          setIsAuthenticated(true);

          console.log('Role from profile:', profile.role);

          // ✅ FIX: Ensure profile.role is available before updating state
          if (profile.role) {
            setIsAdmin(profile.role === 'admin');
            localStorage.setItem('role', profile.role);
          } else {
            console.warn('No role found in profile');
          }

          // ✅ Store profile in localStorage
          localStorage.setItem('user', JSON.stringify(profile));
        }
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setIsAuthenticated(false);

        // ✅ Token Refresh Logic
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          try {
            console.log('Refreshing token...');
            const response = await axios.post(
              `${process.env.REACT_APP_API_URL}/api/user/refresh-token`,
              { refreshToken }
            );

            const { token, refreshToken: newRefreshToken } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', newRefreshToken);

            await loadUser(); // ✅ Reload after token refresh
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            logout(); // ✅ Logout if refresh fails
          }
        }
      }
    };

    if (localStorage.getItem('token')) {
      loadUser();
    }
  }, []);

  const login = async (username, password) => {
    try {
      console.log('Submitting login request...');
      const { token, refreshToken, user } = await loginUser({ username, password });

      setUser(user);
      setIsAuthenticated(true);
      setIsAdmin(user.role === 'admin');

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('role', user.role);
     // localStorage.setItem('isAdmin', user.role === 'admin' ? 'true' : 'false');
      localStorage.setItem('user', JSON.stringify(user));

      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Sending logout request...');
      await logoutUser();

      localStorage.clear();

      setUser(null);
      setIsAuthenticated(false);
      setIsAdmin(false);

      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;
