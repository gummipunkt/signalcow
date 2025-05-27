'use client'; // Important for client-side interactivity like useState and event handlers

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; // useSearchParams added
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, setError, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams(); // For query parameters
  const [loginMessage, setLoginMessage] = useState<string | null>(null); // For messages like "Registration successful"

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.push('/dashboard');
      return; // Important to skip further logic in this effect
    }

    // Show message after successful registration
    if (searchParams.get('registered') === 'true') {
      setLoginMessage('Registration successful! Please log in.');
      // Optional: Remove query parameter from URL to avoid showing the message on every reload
      // router.replace('/login', { scroll: false }); // CAUTION: Check Next.js 13 App Router behavior
    }

    // Reset error on mount if present and not authenticated
    if (error) {
        setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps 
  }, [isAuthenticated, isLoading, router, searchParams]); // setError was removed as it's in the Context and should not be changed directly here, except by the Context itself.

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginMessage(null); // Remove old messages
    if (!email || !password) {
      setError('Email and password are required.'); // Use setError from Context
      return;
    }
    await login(email, password); // Call the new login function in the Context
    // Redirect and error handling is done in the Context
  };

  // Loading indicator when auth status is being checked or already logged in and redirect is pending
  if (isLoading || (!error && isAuthenticated)) { // Small adjustment: Show loading indicator also if isAuthenticated but isLoading is still true
    return (
        <section className="section">
            <div className="container has-text-centered">
                {isLoading && <p>Loading authentication status...</p>}
                {isAuthenticated && <p>You are already logged in. Redirecting to dashboard...</p>}
                <progress className="progress is-small is-primary mt-3" max="100"></progress>
            </div>
        </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: '400px' }}>
        <div className="box">
          <h1 className="title has-text-centered">Login</h1>
          {loginMessage && (
            <div className="notification is-success is-light">
                {loginMessage}
            </div>
          )}
          {error && (
            <div className="notification is-danger is-light">
              <button className="delete" onClick={() => setError(null)}></button>
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
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="field">
              <label className="label" htmlFor="password">Password</label>
              <div className="control">
                <input 
                  className="input" 
                  type="password" 
                  id="password"
                  placeholder="********"
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                />
              </div>
            </div>
            <div className="field">
              <button 
                type="submit" 
                className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
                disabled={isLoading} // Use isLoading from Context
              >
                Login
              </button>
            </div>
          </form>
          <hr />
          <p className="has-text-centered">
            Don&apos;t have an account yet? <Link href="/register">Register here</Link>.
          </p>
        </div>
      </div>
    </section>
  );
} 