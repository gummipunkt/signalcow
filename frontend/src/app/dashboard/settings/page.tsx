'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext'; // Assuming useAuth provides the token via a context

export default function SettingsPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth(); // Get token for authenticated requests

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setError('All password fields are required.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password.');
      }

      setMessage(data.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Optionally, provide feedback or redirect
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <div className="box">
        <h1 className="title is-4 has-text-centered">Change Password</h1>
        {message && (
          <div className="notification is-success is-light">
            {message}
          </div>
        )}
        {error && (
          <div className="notification is-danger is-light">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label className="label" htmlFor="currentPassword">Current Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                id="currentPassword"
                placeholder="Your current password"
                value={currentPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="newPassword">New Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                id="newPassword"
                placeholder="Your new password"
                value={newPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field">
            <label className="label" htmlFor="confirmNewPassword">Confirm New Password</label>
            <div className="control">
              <input
                className="input"
                type="password"
                id="confirmNewPassword"
                placeholder="Confirm your new password"
                value={confirmNewPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="field mt-5">
            <button
              type="submit"
              className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Changing Password...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 