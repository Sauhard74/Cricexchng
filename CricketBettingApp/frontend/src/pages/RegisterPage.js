import { useState } from 'react';
import { register } from '../api/authService';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages/auth.css';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...registerData } = formData;
      console.log('Submitting registration payload:', registerData);
      
      await register(registerData);
      navigate('/login');
    } catch (error) {
      console.error('Registration failed:', error);
      setError(error.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <h1>🏏 Cricket Betting</h1>
      </div>
      
      <h2>Create Your Account</h2>
      
      {error && (
        <div className="error-message">
          <i className="fas fa-exclamation-circle"></i> {error}
        </div>
      )}
      
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="input-group">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            name="username"
            placeholder="Choose a unique username"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            name="phone"
            placeholder="Enter your phone number"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            name="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="input-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-button"
          disabled={isLoading}
          style={{ backgroundColor: 'blue', color: 'white' }} // blue button , white text
        >
          {isLoading ? 'Creating Account...' : 'Register'}
        </button>
      </form>
      
      <div className="auth-divider">
        <span>OR</span>
      </div>
      
      <p className="auth-message">
        Already have an account? <Link to="/login">Login instead</Link>
      </p>
      
      <div className="auth-footer">
        &copy; {new Date().getFullYear()} Cricket Betting App. All rights reserved.
      </div>
    </div>
  );
};

export default RegisterPage;
