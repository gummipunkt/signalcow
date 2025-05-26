'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Group {
  id: number;
  group_name: string;
  description: string | null;
  signal_group_id?: string | null;
}

export default function NewGroupPage() {
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [signalGroupId, setSignalGroupId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authIsLoading, isAuthenticated, router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!name.trim()) {
      setError('Group name is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          group_name: name, 
          description: description, 
          signal_group_id: signalGroupId || null
        }),
      });

      const responseData: Group = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Error creating group');
      }
      
      router.push(`/dashboard/groups/${responseData.id}/edit`);
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authIsLoading) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p className="title is-4">Loading...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <h1 className="title">Create New Group</h1>
        <div className="box">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="notification is-danger is-light">
                <button className="delete" onClick={() => setError(null)}></button>
                {error}
              </div>
            )}

            <div className="field">
              <label htmlFor="groupName" className="label">Group Name</label>
              <div className="control">
                <input 
                  id="groupName" 
                  className="input" 
                  type="text" 
                  placeholder="Name of the group" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="groupDescription" className="label">Description (optional)</label>
              <div className="control">
                <textarea 
                  id="groupDescription"
                  className="textarea"
                  placeholder="A short description of the group"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                ></textarea>
              </div>
            </div>

            <div className="field">
              <label htmlFor="signalGroupId" className="label">Signal Group ID (optional)</label>
              <div className="control">
                <input 
                  id="signalGroupId" 
                  className="input" 
                  type="text" 
                  placeholder="Internal ID of your Signal group (recommended: link later)"
                  value={signalGroupId}
                  onChange={(e) => setSignalGroupId(e.target.value)}
                />
              </div>
              <p className="help">
                Manual entry of the Signal Group ID is for advanced users. 
                We recommend leaving this field empty and linking the group automatically and securely via a link token on the next page after saving.
                If you still want to enter the ID manually: Add the bot (Tel: <span className="has-text-weight-bold">{process.env.NEXT_PUBLIC_BOT_PHONE_NUMBER || '[Bot Phone Number]'}</span>) to your Signal group and enter the group ID here (e.g., from Signal Desktop group settings).
              </p>
            </div>

            <div className="field">
              <div className="control">
                <button 
                  type="submit" 
                  className={`button is-primary ${isSubmitting ? 'is-loading' : ''}`}
                  disabled={isSubmitting}
                >
                  Create Group and Continue
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
} 