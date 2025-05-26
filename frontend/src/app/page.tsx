'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import styles from "./page.module.css";

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="container has-text-centered">
        <p className="is-size-4">Loading...</p>
      </div>
    );
  }

  if (isAuthenticated) {
    return (
      <div className="container has-text-centered">
        <p className="is-size-4">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <section className={`hero is-fullheight-with-navbar ${styles.heroBackground}`}>
      <div className="hero-body">
        <div className="container has-text-centered">
          <h1 className={`title is-1 ${styles.title}`}>
            Signalcow
          </h1>
          <h2 className={`subtitle is-3 ${styles.subtitle}`}>
            Your intelligent assistant for automating Signal interactions and notification management.
          </h2>
          <p className={` ${styles.description}`}>
            Connect your systems, create webhooks, and let Signalcow handle communication for you.
            Manage groups, messages, and much more via an intuitive admin interface.
          </p>
        </div>
      </div>
    </section>
  );
}
