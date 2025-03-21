import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../styles/pages/auth.css';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Submitting login payload:', formData);
      await login(formData.username, formData.password);
      navigate('/home'); // Redirect to Home Page after login
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.response?.data?.error || 'Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-logo">
        <h1>🏏 Cricket Betting</h1>
      </div>
      
      <h2>Welcome Back</h2>
      
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
            placeholder="Enter your username"
            value={formData.username}
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
            placeholder="Enter your password"
            value={formData.password}
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
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div className="auth-divider">
        <span>OR</span>
      </div>
      
      <p className="auth-message">
        Don't have an account? <Link to="/register">Register now</Link>
      </p>
      
      <div className="auth-footer">
        &copy; {new Date().getFullYear()} Cricket Betting App. All rights reserved.
      </div>
    </div>
  );
};

export default LoginPage;
