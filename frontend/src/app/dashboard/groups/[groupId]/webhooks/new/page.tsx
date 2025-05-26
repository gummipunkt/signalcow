'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Group {
  id: number;
  group_name: string;
}

interface NewWebhookResponse {
    id: number;
    webhook_token: string;
    is_active: boolean;
    description: string | null;
    created_at: string;
    webhook_url: string; // The backend sends this along!
}

export default function NewWebhookPage() {
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;

  const [group, setGroup] = useState<Group | null>(null);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // For loading group data
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdWebhook, setCreatedWebhook] = useState<NewWebhookResponse | null>(null);

  const fetchGroupDetails = useCallback(async () => {
    if (!token || !isAuthenticated || !groupId) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Error loading group details.');
      }
      const data: Group = await response.json();
      setGroup(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoadingData(false);
    }
  }, [token, isAuthenticated, groupId]);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authIsLoading, isAuthenticated, router]);

  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setCreatedWebhook(null);

    try {
      const response = await fetch(`/api/groups/${groupId}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ description }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error creating webhook');
      }
      const newWebhook: NewWebhookResponse = await response.json();
      setCreatedWebhook(newWebhook);
      // Optional: Redirect to webhook overview after successful creation?
      // router.push(`/dashboard/groups/${groupId}/webhooks`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authIsLoading || isLoadingData) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p className="title is-4">Loading group details...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  if (!group && !isLoadingData) { // If group was not loaded (even after attempting to load)
    return (
      <section className="section">
        <div className="container">
          <div className="notification is-danger">
            <p>{error || 'Group not found or access denied.'}</p>
            <Link href="/dashboard/groups" className="button is-light mt-3">Back to group overview</Link>
          </div>
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
            <li><Link href={`/dashboard/groups/${groupId}/webhooks`}>{group?.group_name || 'Webhooks'}</Link></li>
            <li className="is-active"><a href="#" aria-current="page">New Webhook</a></li>
          </ul>
        </nav>

        <h1 className="title">Create New Webhook for Group "{group?.group_name}"</h1>
        
        {createdWebhook ? (
          <div className="box">
            <div className="notification is-success">
                <p className="is-size-5 has-text-weight-semibold">Webhook created successfully!</p>
            </div>
            <p className="mb-2"><strong>Description:</strong> {createdWebhook.description || '-'}</p>
            <p className="mb-2"><strong>Webhook URL:</strong></p>
            <div className="field has-addons">
                <div className="control is-expanded">
                    <input className="input" type="text" value={createdWebhook.webhook_url} readOnly />
                </div>
                <div className="control">
                    <button 
                        className="button is-info" 
                        onClick={() => navigator.clipboard.writeText(createdWebhook.webhook_url)}
                        title="Copy Webhook URL"
                    >
                        <span className="icon is-small"><i className="fas fa-copy"></i></span>
                        <span>Copy</span>
                    </button>
                </div>
            </div>
            <p className="is-size-7 has-text-grey mb-3">This token is shown only once. Please copy it securely.</p>
            
            <div className="field is-grouped mt-4">
                <div className="control">
                    <button onClick={() => setCreatedWebhook(null)} className="button is-primary">
                        Create Another Webhook
                    </button>
                </div>
                <div className="control">
                    <Link href={`/dashboard/groups/${groupId}/webhooks`} className="button is-light">
                        Back to Webhook Overview
                    </Link>
                </div>
            </div>
          </div>
        ) : (
          <div className="box">
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="notification is-danger is-light">
                  <button className="delete" onClick={() => setError(null)}></button>
                  {error}
                </div>
              )}

              <div className="field">
                <label htmlFor="webhookDescription" className="label">Description (optional)</label>
                <div className="control">
                  <input 
                    id="webhookDescription"
                    className="input"
                    type="text" 
                    placeholder="E.g., For order confirmations"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="field is-grouped">
                <div className="control">
                  <button 
                    type="submit" 
                    className={`button is-primary ${isSubmitting ? 'is-loading' : ''}`}
                    disabled={isSubmitting}
                  >
                    Create Webhook
                  </button>
                </div>
                <div className="control">
                  <Link href={`/dashboard/groups/${groupId}/webhooks`} className="button is-light">
                    Cancel
                  </Link>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
} 