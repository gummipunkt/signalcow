'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { register, error, setError, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.push('/dashboard');
      return;
    }
    if (error) {
        setError(null);
    }
  }, [isAuthenticated, isLoading, router, setError]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username || !email || !password) {
      setError('All fields are required.');
      return;
    }
    await register(username, email, password);
  };

  if (isLoading || (!error && isAuthenticated)) {
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
          <h1 className="title has-text-centered">Register</h1>
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="notification is-danger is-light">
                 <button className="delete" onClick={() => setError(null)}></button>
                {error}
              </div>
            )}
            <div className="field">
              <label className="label" htmlFor="username">Username</label>
              <div className="control">
                <input 
                  className="input" 
                  type="text" 
                  id="username"
                  placeholder="Your username"
                  value={username} 
                  onChange={(e) => setUsername(e.target.value)} 
                  required 
                />
              </div>
            </div>
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
                  placeholder="At least 6 characters"
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
                disabled={isLoading}
              >
                Register
              </button>
            </div>
          </form>
          <hr />
          <p className="has-text-centered">
            Already have an account? <Link href="/login">Login here</Link>.
          </p>
        </div>
      </div>
    </section>
  );
} 