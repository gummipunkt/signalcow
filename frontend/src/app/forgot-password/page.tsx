'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);
    setIsLoading(true);

    if (!email) {
      setError('Email is required.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        console.error("Forgot password API error:", await response.text());
      }
      
      setMessage('If an account with that email exists, a password reset link has been sent.');
    } catch (err: unknown) {
      console.error("Forgot password submission error:", err);
      if (err instanceof Error) {
        setMessage('If an account with that email exists, a password reset link has been sent.');
      } else {
        setMessage('If an account with that email exists, a password reset link has been sent.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '400px' }}>
        <div className="box">
          <h1 className="title has-text-centered">Forgot Password</h1>
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
              <label className="label" htmlFor="email">Email</label>
              <div className="control">
                <input
                  className="input"
                  type="email"
                  id="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="field">
              <button
                type="submit"
                className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
                disabled={isLoading}
              >
                Send Reset Link
              </button>
            </div>
          </form>
          <hr />
          <p className="has-text-centered">
            Remembered your password? <Link href="/login">Login here</Link>.
          </p>
        </div>
      </div>
    </section>
  );
} 