'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const tokenFromQuery = searchParams.get('token');
    const emailFromQuery = searchParams.get('email');
    if (tokenFromQuery && emailFromQuery) {
      setToken(tokenFromQuery);
      setEmail(emailFromQuery);
    } else {
      setError('Missing token or email in URL. Please use the link from your email.');
      // Optionally redirect to login or forgot-password page
      // router.push('/login');
    }
  }, [searchParams, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    if (!password || !confirmPassword) {
      setError('Please enter and confirm your new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token || !email) {
      setError('Token or email is missing. Cannot reset password.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password.');
      }

      setMessage(data.message || 'Password has been reset successfully. You can now login with your new password.');
      // Optionally redirect to login after a delay
      setTimeout(() => router.push('/login'), 5000);

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

  if (!token || !email) {
    // Show error if token/email is not available or still loading
    return (
      <section className="section">
        <div className="container" style={{ maxWidth: '450px' }}>
          <div className="box">
            <h1 className="title has-text-centered">Reset Password</h1>
            {error && <div className="notification is-danger is-light">{error}</div>}
            {!error && <p>Loading or invalid link...</p>}
            <hr />
            <p className="has-text-centered">
                <Link href="/login">Back to Login</Link>
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '450px' }}>
        <div className="box">
          <h1 className="title has-text-centered">Reset Password</h1>
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
            <p className="mb-3">Enter your new password for: <strong>{email}</strong></p>
            <div className="field">
              <label className="label" htmlFor="password">New Password</label>
              <div className="control">
                <input
                  className="input"
                  type="password"
                  id="password"
                  placeholder="********"
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="confirmPassword">Confirm New Password</label>
              <div className="control">
                <input
                  className="input"
                  type="password"
                  id="confirmPassword"
                  placeholder="********"
                  value={confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <button
                type="submit"
                className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
                disabled={isLoading || !!message} // Disable if loading or success message is shown
              >
                {isLoading ? 'Resetting Password...' : 'Reset Password'}
              </button>
            </div>
          </form>
          {message && (
             <p className="has-text-centered mt-3">
                <Link href="/login">Proceed to Login</Link>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// Wrap with Suspense for useSearchParams
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
} 