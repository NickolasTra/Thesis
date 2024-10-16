import React, { useState } from 'react';
import styles from './PasswordChangeModal.module.css';

const PasswordChangeModal = ({ isOpen, onClose, userId, axiosAuth }) => {
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setError('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setError('New password must be at least 6 characters long');
            return;
        }

        try {
            await axiosAuth.post(`/users/change-password/${userId}`, {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            alert('Password changed successfully');
            onClose();
        } catch (err) {
            console.error('Error changing password:', err);
            setError(err.response?.data?.message || 'Failed to change password');
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h2>Change Password</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="currentPassword">Current Password:</label>
                        <input
                            type="password"
                            id="currentPassword"
                            name="currentPassword"
                            value={passwordData.currentPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="newPassword">New Password:</label>
                        <input
                            type="password"
                            id="newPassword"
                            name="newPassword"
                            value={passwordData.newPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="confirmPassword">Confirm New Password:</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            name="confirmPassword"
                            value={passwordData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    {error && <p className={styles.error}>{error}</p>}
                    <div className={styles.buttonGroup}>
                        <button type="submit" className={styles.submitButton}>Change Password</button>
                        <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PasswordChangeModal;