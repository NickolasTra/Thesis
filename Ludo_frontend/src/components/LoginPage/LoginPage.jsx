import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './LoginPage.module.css';
import axios from 'axios';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const appToken = searchParams.get('appToken');

  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    try {
      const response = await axios.post('https://tragiannis.site/api/users/login', {...formData, appToken: appToken}, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const { accessToken, refreshToken, userId } = response.data;
      await login(accessToken, refreshToken, userId);

      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setFormData(prevData => ({ ...prevData, email: rememberedEmail }));
      setRememberMe(true);
    }
  }, []);

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <img src="/assets/svg/person-circle.svg" alt="Log in" className={styles.logo} />
        <h2>Login</h2>
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
        <form onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
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
          <div className={styles.rememberMe}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">Remember me</label>
          </div>
          <button type="submit">Login</button>
        </form>
        {error && <p className={styles.errorMessage}>{error}</p>}
        <p>
          Don't have an account? <Link to={`/signup${appToken ? `?appToken=${appToken}` : ''}`}>Sign up</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;