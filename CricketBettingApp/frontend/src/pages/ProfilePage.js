import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../styles/pages/ProfilePage.css';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { updateUserData } = useAuth();
  const [profile, setProfile] = useState({
    username: '',
    phone: '',
    credits: 0,
  });
  const [amount, setAmount] = useState(100);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('token');
        
        if (!token) {
          setError('Authentication required. Please log in again.');
          setIsLoading(false);
          return;
        }
        
        console.log('Fetching profile from:', `${process.env.REACT_APP_API_URL}/api/user/profile`);
        
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 10000
        });
        
        console.log('Profile data:', response.data);
        const profileData = {
          ...response.data,
          credits: response.data.credits ? Number(response.data.credits) : 0
        };
        setProfile(profileData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Failed to load profile. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    console.log('Current profile credits:', profile.credits, typeof profile.credits);
  }, [profile.credits]);

  const handleRequestCredits = async () => {
    try {
      setRequestSuccess(false);
      
      if (amount <= 0) {
        alert('Please enter a valid amount greater than zero.');
        return;
      }
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        alert('Authentication required. Please log in again.');
        return;
      }
      
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/user/request-credits`,
        { amount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log('Credit request response:', response.data);
      setRequestSuccess(true);
      
      // Update global user data
      await updateUserData();
      
      // Refresh local profile data 
      const profileResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000
      });
      const updatedProfileData = {
        ...profileResponse.data,
        credits: profileResponse.data.credits ? Number(profileResponse.data.credits) : 0
      };
      setProfile(updatedProfileData);
      
      setShowRequestForm(false);
      alert(response.data.message || 'Credits requested successfully!');
    } catch (error) {
      console.error('Error requesting credits:', error);
      alert(error.response?.data?.message || 'Failed to request credits. Please try again.');
    }
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
  
    // Allow empty value for controlled input
    if (value === '') {
      setAmount('');
      return;
    }
  
    // Ensure it's a valid number
    const numValue = Number(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setAmount(numValue);
    }
  };

  if (isLoading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i>
          <p>{error}</p>
          <button 
            className="retry-button" 
            onClick={() => window.location.reload()}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page-wrapper">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar-container">
              <div className="avatar">{profile.username?.charAt(0) || 'U'}</div>
            </div>
            <h2>{profile.username}</h2>
            <p className="phone-number">{profile.phone || 'No phone number provided'}</p>
          </div>

          <div className="profile-stats">
            <div className="stat-card credits-card">
              <div className="stat-icon">
                <i className="fas fa-coins"></i>
              </div>
              <div className="stat-details">
                <span className="stat-label">Available Credits</span>
                <span className="stat-value">
                  {profile.credits !== undefined && profile.credits !== null 
                    ? Number(profile.credits).toLocaleString() 
                    : '0'}
                </span>
              </div>
            </div>
          </div>
          
          {!showRequestForm ? (
            <div className="profile-actions">
              <button 
                className="action-button primary" 
                onClick={() => setShowRequestForm(true)}
              >
                <i className="fas fa-plus-circle"></i>
                Request Credits
              </button>
            </div>
          ) : (
            <div className="request-credits-form">
              <h3>Request Additional Credits</h3>
              <div className="form-group">
                <label>Amount to Request</label>
                <div className="input-container">
                  <input
                    type="number"
                    className="amount-input"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="Enter amount"
                    min="100"
                  />
                  <div className="preset-amounts">
                    {[100, 500, 1000, 5000].map(presetAmount => (
                      <button 
                        key={presetAmount}
                        className="preset-amount-btn"
                        onClick={() => setAmount(presetAmount)}
                      >
                        {presetAmount}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button 
                  onClick={() => setShowRequestForm(false)} 
                  className="action-button secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestCredits} 
                  className={`action-button primary ${requestSuccess ? 'success' : ''}`}
                >
                  Submit Request
                </button>
              </div>
              <p className="request-note">
                <i className="fas fa-info-circle"></i>
                Credit requests require admin approval before being added to your account.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
