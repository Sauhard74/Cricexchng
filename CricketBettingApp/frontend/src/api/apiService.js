import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL + '/api';

// Create axios instance with better error handling
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000
});

// Add response interceptor for better error logging
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// ✅ Fetch Live Matches
export const getLiveMatches = async () => {
  try {
    const response = await axios.get(`${API_URL}/matches/live`);
    console.log('API Response:', response.data); // Debug log
    
    // Ensure we return an empty array if no data
    return response.data || [];
  } catch (error) {
    console.error('Error fetching live matches:', error);
    // Return empty array on error to prevent undefined issues
    return [];
  }
};

// ✅ Fetch Matches by Date
export const getMatchesByDate = async (date) => {
  try {
    console.log('Fetching matches for date:', date);
    const { data } = await apiClient.get(`/matches/${date}`);
    console.log('Matches data:', data);
    return data;
  } catch (error) {
    console.error('Failed to fetch matches by date:', error.response?.data?.error || error.message);
    return [];
  }
};

// ✅ Fetch Match Details
export const getMatchDetails = async (matchId) => {
  try {
    const { data } = await apiClient.get(`/match/${matchId}`);
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch match details";
  }
};

// ✅ Place a Bet
export const placeBet = async (betData) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.post('/bet/place', betData, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to place bet";
  }
};

// ✅ Get All Bets (Admin)
export const getAllBets = async () => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.get('/bet/all', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch bets";
  }
};

// ✅ Cancel a Bet (Admin)
export const cancelBet = async (betId) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.delete(`/bet/${betId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to cancel bet";
  }
};

// ✅ Update Bet (Admin)
export const updateBet = async (betId, status) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.put(
      `/bet/update/${betId}`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to update bet";
  }
};

// ✅ Fetch Admin Data (Users)
export const getAllUsers = async () => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.get('/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch users";
  }
};

// ✅ Fetch Credit Requests
export const getAllCreditRequests = async () => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.get('/admin/credit-requests', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to fetch credit requests";
  }
};

// ✅ Approve or Reject Credit Request
export const updateCreditRequest = async (id, status, reason) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.post(
      `/admin/credit-requests/${id}`,
      { status, reason },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to update credit request";
  }
};

// ✅ Get User Bets
export const getUserBets = async (username) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.get(`/bet/${username}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to load user bets";
  }
};

// ✅ Update Match Result
export const updateMatchResult = async (matchId, winner) => {
  try {
    const token = localStorage.getItem("token");
    const { data } = await apiClient.post(
      `/admin/update-result`,
      { matchId, winner },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return data;
  } catch (error) {
    throw error.response?.data?.error || "Failed to update match result";
  }
};

// ✅ Debug function to directly check odds data
export const debugCheckOdds = async () => {
  try {
    const { data } = await apiClient.get('/debug/odds-direct');
    console.log('Debug odds data:', data);
    return data;
  } catch (error) {
    console.error('Debug check failed:', error.response?.data?.error || error.message);
    return { success: false, error: error.message };
  }
};
