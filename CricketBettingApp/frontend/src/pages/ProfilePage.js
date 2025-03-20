import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import '../styles/pages/ProfilePage.css';

const ProfilePage = () => {
  const [profile, setProfile] = useState({
    username: '',
    phone: '',
    credits: 0,
    bets: [],
  });
  const [amount, setAmount] = useState(100); // Default value for request credits

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5001/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log('Profile Data:', response.data);
        setProfile(response.data);
      } catch (error) {
        console.error('Error fetching profile:', error);
      }
    };

    fetchProfile();
  }, []);

  const handleRequestCredits = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5001/api/user/request-credits',
        { amount }, // ✅ Pass the amount field
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(response.data.message || 'Credits requested successfully!');
    } catch (error) {
      console.error('Error requesting credits:', error);
      alert(error.response?.data?.message || 'Failed to request credits');
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-card">
        <h2>👤 {profile.username}</h2>
        <p>📞 {profile.phone || 'Not provided'}</p>

        <div className="credits-section">
          <h3>🖥️ Credits: {profile.credits}</h3>
          <div className="request-credits-container">
            {/* ✅ Input to select amount */}
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="amount-input"
              placeholder="Enter Amount"
            />
            <button onClick={handleRequestCredits} className="request-credits-btn">
              Request Credits
            </button>
          </div>
        </div>

        <div className="bet-history">
          <h3>🎯 Bet History</h3>
          {profile.bets.length > 0 ? (
            <table className="bets-table">
              <thead>
                <tr>
                  <th>Match ID</th>
                  <th>Team</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {profile.bets.map((bet) => (
                  <tr key={bet._id}>
                    <td>{bet.matchId}</td>
                    <td>{bet.team}</td>
                    <td>{bet.amount}</td>
                    <td>{bet.status}</td>
                    <td>{new Date(bet.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No bets placed yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
