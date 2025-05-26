'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminDashboardPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/login'); // Or redirect to a generic dashboard if not admin but logged in
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !isAuthenticated || !user?.is_admin) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p>Loading or checking admin permissions...</p>
          <progress className="progress is-small is-primary" max="100">15%</progress>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="title">Admin Dashboard</h1>
        <p className="subtitle">
          Welcome, Administrator <strong>{user.username}</strong>!
        </p>

        <div className="columns is-multiline mt-5">
          <div className="column is-one-third">
            <div className="box">
              <h2 className="title is-5">User Management</h2>
              <p>View and manage all users in the system.</p>
              <Link href="/dashboard/admin/users" className="button is-link mt-3">
                Manage Users
              </Link>
            </div>
          </div>

          <div className="column is-one-third">
            <div className="box">
              <h2 className="title is-5">Group Management</h2>
              <p>View and manage all groups in the system.</p>
              <Link href="/dashboard/admin/groups" className="button is-link mt-3">
                Manage Groups
              </Link>
            </div>
          </div>

          <div className="column is-one-third">
            <div className="box">
              <h2 className="title is-5">Webhook Management</h2>
              <p>View and manage all webhooks in the system.</p>
              <Link href="/dashboard/admin/webhooks" className="button is-link mt-3">
                Manage Webhooks
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
} 