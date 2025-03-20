import { useState } from 'react';
import { loginUser } from '../api/authService';
import { useNavigate } from 'react-router-dom';
import '../styles/pages/auth.css';
import {useAuth} from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const {login} = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  try {
    console.log('Submitting login payload:', formData);
    await login(formData.username, formData.password);
    navigate('/home'); // ✅ Redirect to Home Page after login
  } catch (error) {
    console.error('Login failed:', error);
    setError(error.response?.data?.error || 'Login failed');
  }
};


  return (
    <div className="auth-container">
      <h2>🔒 Login</h2>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Login</button>
      </form>
      <p>
        Don't have an account? <a href="/register">Register here</a>
      </p>
    </div>
  );
};

export default LoginPage;
