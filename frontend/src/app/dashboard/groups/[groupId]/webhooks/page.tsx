'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Webhook {
  id: number;
  webhook_token: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  webhook_url?: string; // Optional, if sent from the backend on creation
}

interface Group {
  id: number;
  group_name: string;
}

export default function GroupWebhooksPage() {
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  const fetchGroupDetails = useCallback(async () => {
    if (!token || !isAuthenticated || !groupId) return;
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error loading group details.');
      const data: Group = await response.json();
      setGroup(data);
    } catch (err: any) {
      setError(err.message); // Set error when loading group
    }
  }, [token, isAuthenticated, groupId]);

  const fetchWebhooks = useCallback(async () => {
    if (!token || !isAuthenticated || !groupId) return;
    setIsLoading(true);
    setError(null);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/webhooks`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error fetching webhooks');
      }
      const data: Webhook[] = await response.json();
      setWebhooks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token, isAuthenticated, groupId]);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authIsLoading, isAuthenticated, router]);

  useEffect(() => {
    fetchGroupDetails();
    fetchWebhooks();
  }, [fetchGroupDetails, fetchWebhooks]);

  const handleDeleteWebhook = async (webhookId: number) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) {
      return;
    }
    setIsDeleting(webhookId);
    setDeleteError(null);
    try {
      const response = await fetch(`/api/groups/${groupId}/webhooks/${webhookId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error deleting webhook');
      }
      setWebhooks(prev => prev.filter(wh => wh.id !== webhookId));
    } catch (err: any) {
      setDeleteError(err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  if (authIsLoading || isLoading) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p className="title is-4">Loading webhooks...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  if (error && !group) { // Error loading group
    return (
        <section className="section">
            <div className="container">
                <div className="notification is-danger">
                    <p>{error}</p>
                    <Link href="/dashboard/groups" className="button is-light mt-3">
                        Back to group overview
                    </Link>
                </div>
            </div>
        </section>
    );
  }
  
  if (!group) { // Fallback if group could not be loaded, but no explicit error was caught above
    return (
        <section className="section">
            <div className="container">
                <p>Group details could not be loaded.</p>
                 <Link href="/dashboard/groups" className="button is-light mt-3">
                        Back to group overview
                    </Link>
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
            <li><Link href="/dashboard/groups">Groups</Link></li>
            <li className="is-active"><a href="#" aria-current="page">{group?.group_name || 'Group'} - Webhooks</a></li>
          </ul>
        </nav>

        <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
          <h1 className="title">Webhooks for {group?.group_name || 'Group'}</h1>
          <Link href={`/dashboard/groups/${groupId}/webhooks/new`} className="button is-primary">
            Create New Webhook
          </Link>
        </div>

        {error && !webhooks.length && ( // Error specific to webhooks if group was loaded
            <div className="notification is-warning">
                <p>Error loading webhooks: {error}. Please try again later.</p>
            </div>
        )}

        {deleteError && (
          <div className="notification is-danger is-light mb-4">
            <button className="delete" onClick={() => setDeleteError(null)}></button>
            Error deleting: {deleteError}
          </div>
        )}

        {webhooks.length === 0 && !isLoading && !error ? (
          <div className="notification is-info">
            <p>No webhooks have been created for this group yet.</p>
          </div>
        ) : (
          webhooks.map(webhook => (
            <div key={webhook.id} className="box mb-4">
              <div className="columns is-vcentered">
                <div className="column">
                  <p className="is-size-5 has-text-weight-semibold">
                    {webhook.description || 'No description'}
                  </p>
                  <p className="is-size-7 has-text-grey">
                    Token: <code>{webhook.webhook_token.substring(0, 8)}...</code>
                    <button 
                        className="button is-small is-light ml-2" 
                        onClick={() => navigator.clipboard.writeText(webhook.webhook_token)}
                        title="Copy token"
                    >
                        <span className="icon is-small"><i className="fas fa-copy"></i></span>
                    </button>
                  </p>
                  <p className="is-size-7 has-text-grey">
                    Created at: {new Date(webhook.created_at).toLocaleDateString('en-US')}
                  </p>
                </div>
                <div className="column is-narrow">
                  <span className={`tag ${webhook.is_active ? 'is-success' : 'is-warning'}`}>
                    {webhook.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="column is-narrow">
                  <button 
                    className={`button is-danger is-light is-small ${isDeleting === webhook.id ? 'is-loading' : ''}`}
                    onClick={() => handleDeleteWebhook(webhook.id)}
                    disabled={isDeleting === webhook.id}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
} 