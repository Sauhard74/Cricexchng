import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL + '/api/user'; // ✅ Fix URL


export const refreshToken = async () => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token available');

    const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/user/refresh-token`, { refreshToken });
    localStorage.setItem('token', data.token);
    return data.token;
  } catch (error) {
    console.error('Failed to refresh token:', error);
    throw error;
  }
};

// ✅ Register User
export const register = async (userData) => {
  console.log('Sending registration payload:', userData); // ✅ Debugging
  const { data } = await axios.post(`${API_URL}/register`, userData);
  return data;
};

export const loginUser = async ({username, password}) => {
  try {
    console.log('Sending login payload:', {username, password}); // ✅ Debugging
    const { data } = await axios.post(`${API_URL}/login`, {username, password});
    localStorage.setItem('token', data.token);
    localStorage.setItem('refreshToken', data.refreshToken);
    console.log('Login success:', data);
    return data;
  } catch (error) {
    console.error('Login failed:', error);
    throw error.response?.data?.error || 'Login failed';
  }
};


// ✅ Logout User
export const logoutUser = async () => {
  console.log('Sending logout request'); // ✅ Debugging
  await axios.post(`${API_URL}/logout`, null, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  });
  localStorage.removeItem('token');
};

// ✅ Get User Profile
export const getProfile = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token found');

  console.log('Fetching user profile');
  const { data } = await axios.get(`${API_URL}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('Profile loaded:', data);
  return data;
};

// ✅ Request Credits
export const requestCredits = async (amount) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await axios.post(
      `${API_URL}/request-credits`,
      { amount },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to request credits";
  }
};
