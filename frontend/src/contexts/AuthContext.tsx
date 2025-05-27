'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// Extend user data type if necessary (e.g., username)
interface User {
  id: number;
  email: string;
  username: string; // Ensure username is present
  is_admin?: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>; // Takes credentials
  register: (username: string, email: string, password: string) => Promise<void>; // For registration
  logout: () => void;
  isLoading: boolean; // Renamed from authIsLoading for consistency with previous usage
  error: string | null; // Error status
  setError: (error: string | null) => void; // Function to set errors
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // For initial loading and API calls
  const [error, setError] = useState<string | null>(null); // Central error status
  const router = useRouter();

  useEffect(() => {
    setIsLoading(true);
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    console.log('[AuthContext] useEffect - storedUser from localStorage:', storedUser);
    
    if (storedToken && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        console.log('[AuthContext] useEffect - parsedUser:', parsedUser); // DEBUG
        setToken(storedToken);
        setUser(parsedUser);
      } catch (e) {
        console.error("Error parsing stored user data from localStorage", e);
        console.error("Problematic storedUser string was:", storedUser); // Log problematic string
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    }
    setIsLoading(false);
  }, []);

  // Login function that performs the API call
  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      console.log('[AuthContext] login - data from API:', data); // DEBUG

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Critical check here:
      if (!data.user || typeof data.user !== 'object' || !data.user.username) {
        console.error('User data is not an object or username missing in login response:', data.user);
        throw new Error('User data incomplete or incorrect after login.');
      }

      console.log('[AuthContext] login - data.user to be stored:', data.user); // DEBUG
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user as User); 
      router.push('/dashboard'); 
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred.');
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('An unexpected error occurred during login.');
      }
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Register function that performs the API call
  const register = async (username: string, email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password }),
      });
      const data = await response.json(); 
      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }
      router.push('/login?registered=true'); 
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'An error occurred.');
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('An unexpected error occurred during registration.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!token && !!user, user, token, login, register, logout, isLoading, error, setError }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 