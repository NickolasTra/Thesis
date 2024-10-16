import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import styles from './SignupPage.module.css';
import axios from 'axios';

const SignupPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        name: '',
        surname: '',
        password: '',
        verifyPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const navigate = useNavigate();
    const location = useLocation();

    const searchParams = new URLSearchParams(location.search);
    const appToken = searchParams.get('appToken');

    const validateField = (name, value) => {
        switch (name) {
            case 'email':
                return !/\S+@\S+\.\S+/.test(value) 
                    ? 'Invalid email address' 
                    : '';
            case 'username':
                return value.length < 3 
                    ? 'Username must be at least 3 characters long' 
                    : '';
            case 'name':
            case 'surname':
                return value.length < 2 
                    ? `${name.charAt(0).toUpperCase() + name.slice(1)} must be at least 2 characters long` 
                    : '';
            case 'password':
                return value.length < 8 
                    ? 'Password must be at least 8 characters long' 
                    : '';
            case 'verifyPassword':
                return value !== formData.password 
                    ? 'Passwords do not match' 
                    : '';
            default:
                return '';
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
        
        setErrors(prevErrors => ({
            ...prevErrors,
            [name]: validateField(name, value)
        }));
    };

    const handleBlur = (e) => {
        const { name, value } = e.target;
        setErrors(prevErrors => ({
            ...prevErrors,
            [name]: validateField(name, value)
        }));
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setApiError('');

        const formErrors = Object.keys(formData).reduce((acc, key) => {
            const error = validateField(key, formData[key]);
            if (error) acc[key] = error;
            return acc;
        }, {});

        if (Object.keys(formErrors).length > 0) {
            setErrors(formErrors);
            return;
        }

        try {
            const response = await axios.post('https://tragiannis.site/api/users/register', formData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status === 201) {
                setFormData({
                    email: '',
                    username: '',
                    name: '',
                    surname: '',
                    password: '',
                    verifyPassword: ''
                });
                setErrors({});

                const loginPath = appToken ? `/login?appToken=${appToken}` : '/login';
                navigate(loginPath, { state: { message: 'Signup successful. Please log in.' } });
            } else {
                setApiError('Signup failed. Please try again.');
            }
        } catch (err) {
            setApiError(err.response?.data?.message || 'Signup failed');
        }
    };

    return (
        <div className={styles.signupPage}>
            <div className={styles.signupCard}>
                <img src="/assets/svg/person-circle.svg" alt="Logo" className={styles.logo} />
                <h2>Sign Up</h2>
                <form onSubmit={handleSignup}>
                    {['email', 'username', 'name', 'surname', 'password', 'verifyPassword'].map((field) => (
                        <div key={field} className={styles.inputGroup}>
                            <input
                                type={
                                    field.includes('password') || field === 'verifyPassword'
                                        ? 'password' 
                                        : field === 'email' 
                                        ? 'email' 
                                        : 'text'
                                }
                                name={field}
                                placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                                value={formData[field]}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className={errors[field] ? styles.inputError : ''}
                                required
                            />
                            {errors[field] && <span className={styles.errorText}>{errors[field]}</span>}
                        </div>
                    ))}
                    <button type="submit" disabled={Object.keys(errors).some(key => errors[key])}>Sign Up</button>
                </form>
                {apiError && <p className={styles.errorMessage}>{apiError}</p>}
                <p className={styles.loginLink}>
                    Already have an account? <Link to={`/login${appToken ? `?appToken=${appToken}` : ''}`}>Log in</Link>
                </p>
            </div>
        </div>
    );
};

export default SignupPage;