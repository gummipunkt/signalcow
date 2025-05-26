'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AdminWebhook {
  id: number;
  webhook_token: string;
  is_active: boolean;
  webhook_description: string | null; // Renamed from description to avoid conflict if any
  created_at: string;
  group_id: number;
  group_name: string;
  user_id: number;
  user_email: string;
  user_username: string;
}

export default function AdminWebhooksPage() {
  const { isAuthenticated, user, isLoading, token } = useAuth();
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<AdminWebhook[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.is_admin && token) {
      const fetchWebhooks = async () => {
        setIsLoadingData(true);
        setPageError(null);
        try {
          const response = await fetch('/api/admin/webhooks', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error fetching webhooks');
          }
          const data: AdminWebhook[] = await response.json();
          setWebhooks(data);
        } catch (err: any) {
          setPageError(err.message);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchWebhooks();
    }
  }, [isAuthenticated, user, token]);

  const handleDeleteWebhook = async (webhookId: number, webhookDesc: string | null) => {
    const displayName = webhookDesc || `ID: ${webhookId}`;
    if (!window.confirm(`Are you sure you want to delete webhook "${displayName}"?`)) {
      return;
    }
    setPageError(null);
    try {
      const response = await fetch(`/api/admin/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error deleting webhook');
      }
      setWebhooks(prevWebhooks => prevWebhooks.filter(wh => wh.id !== webhookId));
      alert('Webhook deleted successfully.');
    } catch (err: any) {
      setPageError(err.message);
      alert(`Error: ${err.message}`);
    }
  };
  
  if (isLoading || isLoadingData) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p>Loading webhook data...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || !user?.is_admin) {
    return (
        <section className="section">
            <div className="container">
                <p>Access Denied. You need to be an admin to view this page.</p>
                <Link href="/dashboard" className="button is-link mt-3">Back to Dashboard</Link>
            </div>
        </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <nav className="breadcrumb" aria-label="breadcrumbs">
          <ul>
            <li><Link href="/dashboard">Dashboard</Link></li>
            <li><Link href="/dashboard/admin">Admin</Link></li>
            <li className="is-active"><a href="#" aria-current="page">Webhook Management</a></li>
          </ul>
        </nav>
        <h1 className="title">Webhook Management (All Users)</h1>

        {pageError && (
          <div className="notification is-danger is-light">
            <button className="delete" onClick={() => setPageError(null)}></button>
            {pageError}
          </div>
        )}

        {webhooks.length === 0 && !isLoadingData ? (
          <div className="notification is-info">
            <p>No webhooks found in the system.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table is-bordered is-striped is-narrow is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Token (Partial)</th>
                  <th>Active</th>
                  <th>Group (Owner)</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {webhooks.map((wh) => (
                  <tr key={wh.id}>
                    <td>{wh.id}</td>
                    <td>{wh.webhook_description || '-'}</td>
                    <td><code>{wh.webhook_token.substring(0,8)}...</code></td>
                    <td>{wh.is_active ? 'Yes' : 'No'}</td>
                    <td>{wh.group_name} ({wh.user_username})</td>
                    <td>{new Date(wh.created_at).toLocaleString()}</td>
                    <td>
                      <button 
                        className="button is-danger is-small"
                        onClick={() => handleDeleteWebhook(wh.id, wh.webhook_description)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
} 