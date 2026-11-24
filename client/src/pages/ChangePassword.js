import './Login.css';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import useRandColor from '../hook/useRandColor';
import { authService } from '../services/api';

const MIN_PASSWORD_LENGTH = 6;

const ChangePassword = () => {
    const [color] = useRandColor();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
            return;
        }

        setLoading(true);
        try {
            const data = await authService.changePassword(currentPassword, newPassword);
            // Sessions opened before the change are revoked; keep this one with the new token
            if (data.token) localStorage.setItem('token', data.token);
            toast.success('Password changed successfully');
            navigate('/', { replace: true });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error changing the password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>
                    Change Password
                    <span style={{ color: `var(--mantine-color-${color}-7)` }}>_</span>
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="currentPassword">Current password</label>
                        <input
                            type="password"
                            id="currentPassword"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPassword">New password</label>
                        <input
                            type="password"
                            id="newPassword"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            minLength={MIN_PASSWORD_LENGTH}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPassword">Confirm new password</label>
                        <input
                            type="password"
                            id="confirmPassword"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={MIN_PASSWORD_LENGTH}
                        />
                    </div>
                    <button type="submit" className="btn-login" disabled={loading}>
                        {loading ? 'Saving...' : 'Change password'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChangePassword;
