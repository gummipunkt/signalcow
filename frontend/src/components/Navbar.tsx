'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // DEBUG: Log user object
  useEffect(() => {
    console.log('[Navbar] Auth isLoading:', isLoading);
    console.log('[Navbar] isAuthenticated:', isAuthenticated);
    console.log('[Navbar] User object:', user);
  }, [user, isAuthenticated, isLoading]);

  const toggleBurger = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = event.currentTarget.dataset.target;
    if (target) {
      const $target = document.getElementById(target);
      event.currentTarget.classList.toggle('is-active');
      $target?.classList.toggle('is-active');
    }
  };

  if (isLoading) {
    return (
      <nav className="navbar" role="navigation" aria-label="main navigation" style={{ backgroundColor: 'var(--pastel-light-lilac)' }}>
        <div className="navbar-brand">
          <Link className="navbar-item" href="/" style={{ color: 'var(--text-color)' }}>
            Signal Bot
          </Link>
        </div>
        <div className="navbar-menu">
          <div className="navbar-end">
            <div className="navbar-item" style={{ color: 'var(--text-color-light)' }}>
              Loading...
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar" role="navigation" aria-label="main navigation" style={{ backgroundColor: 'var(--pastel-lilac)', boxShadow: '0 2px 3px rgba(10, 10, 10, 0.1)' }}>
      <div className="navbar-brand">
        <Link className="navbar-item" href="/" style={{ color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <Image src="/signalcow.svg" alt="Signalcow Logo" width={32} height={32} style={{ marginRight: '8px' }} />
          Signalcow {user ? <span style={{ fontWeight: 'normal', marginLeft: '5px'}}>(User: {user.username || user.email})</span> : ''}
        </Link>
        <a role="button" className="navbar-burger" aria-label="menu" aria-expanded="false" data-target="navbarBasicExample" onClick={toggleBurger} style={{ color: 'white' }}>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
          <span aria-hidden="true"></span>
        </a>
      </div>
      <div id="navbarBasicExample" className="navbar-menu" style={{ backgroundColor: 'var(--pastel-lilac)' }}>
        <div className="navbar-start">
          <Link 
            className="navbar-item" 
            href="/" 
            style={{
              color: 'white', 
              backgroundColor: isMounted && pathname === '/' ? 'var(--pastel-pink)' : 'transparent',
              ...(isMounted && pathname === '/' && { color: 'var(--text-color)' })
            }}
          >
            Home
          </Link>
          {isAuthenticated && (
            <>
              <Link 
                className="navbar-item" 
                href="/dashboard" 
                style={{
                  color: 'white', 
                  backgroundColor: isMounted && pathname === '/dashboard' ? 'var(--pastel-pink)' : 'transparent',
                  ...(isMounted && pathname === '/dashboard' && { color: 'var(--text-color)' })
                }}
              >
                Dashboard
              </Link>
              <Link 
                className="navbar-item" 
                href="/dashboard/groups" 
                style={{
                  color: 'white', 
                  backgroundColor: isMounted && pathname.startsWith('/dashboard/groups') ? 'var(--pastel-pink)' : 'transparent',
                  ...(isMounted && pathname.startsWith('/dashboard/groups') && { color: 'var(--text-color)' })
                }}
              >
                Groups
              </Link>
              {user?.is_admin && (
                <Link 
                  className="navbar-item" 
                  href="/dashboard/admin" 
                  style={{
                    color: 'white', 
                    backgroundColor: isMounted && pathname.startsWith('/dashboard/admin') ? 'var(--pastel-pink)' : 'transparent',
                    ...(isMounted && pathname.startsWith('/dashboard/admin') && { color: 'var(--text-color)' })
                  }}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </div>
        <div className="navbar-end">
          <div className="navbar-item">
            <div className="buttons">
              {isAuthenticated ? (
                <button className="button is-light" onClick={logout} style={{ backgroundColor: 'var(--pastel-pink)', color: 'var(--text-color)', borderColor: 'var(--pastel-pink)' }}>
                  Log out
                </button>
              ) : (
                <>
                  <Link className="button" href="/register" style={{ backgroundColor: 'var(--pastel-light-lilac)', color: 'var(--text-color)', fontWeight: 'bold', borderColor: 'var(--pastel-light-lilac)' }}>
                    <strong>Sign up</strong>
                  </Link>
                  <Link className="button is-light" href="/login" style={{ backgroundColor: 'white', color: 'var(--text-color)' }}>
                    Log in
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 