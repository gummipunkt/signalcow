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
            Your Signalbot for creating webhooks. My name is Torino.
          </h2>
          <p className={` ${styles.description}`}>
            Please be careful, this service is an early alpha, join the <a href="https://github.com/gummipunkt/signalcow">Github repo</a> to get updates.
          </p>
        </div>
      </div>
    </section>
  );
}
