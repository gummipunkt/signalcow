'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Type definition for a group
interface Group {
  id: number;
  group_name: string;
  description: string | null;
  user_id: number;
  created_at: string;
  updated_at: string;
  signal_group_id?: string | null;
  bot_phone_number?: string | null;
}

export default function GroupsPage() {
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authIsLoading, isAuthenticated, router]);

  useEffect(() => {
    if (token && isAuthenticated) {
      const fetchGroups = async () => {
        setIsLoading(true);
        setError(null);
        setDeleteError(null);
        try {
          const response = await fetch('/api/groups', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error fetching groups');
          }
          const data: Group[] = await response.json();
          setGroups(data);
        } catch (err: any) {
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchGroups();
    }
  }, [token, isAuthenticated]);

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('Are you sure you want to delete this group and all associated webhooks?')) {
      return;
    }

    setIsDeleting(groupId);
    setDeleteError(null);

    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error deleting group');
      }

      setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));

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
          <p className="title is-4">Loading groups...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="section">
        <div className="container">
          <div className="notification is-danger">
            <p>Error: {error}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="is-flex is-justify-content-space-between is-align-items-center mb-5">
          <h1 className="title">My Groups</h1>
          <Link href="/dashboard/groups/new" className="button is-primary">
            Create New Group
          </Link>
        </div>

        {deleteError && (
          <div className="notification is-danger is-light mb-4">
            <button className="delete" onClick={() => setDeleteError(null)}></button>
            Error deleting: {deleteError}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="notification is-info">
            <p>You haven't created any groups yet.</p>
          </div>
        ) : (
          <div className="columns is-multiline">
            {groups.map((group) => (
              <div key={group.id} className="column is-one-third">
                <div className="box">
                  <h2 className="title is-5">{group.group_name}</h2>
                  <p className="block">
                    {group.description || 'No description available.'}
                  </p>
                  <div className="field is-grouped">
                    <p className="control">
                      <Link href={`/dashboard/groups/${group.id}/edit`} className="button is-link is-light is-small">
                        Edit
                      </Link>
                    </p>
                    <p className="control">
                      <Link href={`/dashboard/groups/${group.id}/webhooks`} className="button is-info is-light is-small">
                        Webhooks
                      </Link>
                    </p>
                    <p className="control">
                      <button 
                        className={`button is-danger is-light is-small ${isDeleting === group.id ? 'is-loading' : ''}`}
                        onClick={() => handleDeleteGroup(group.id)}
                        disabled={isDeleting === group.id}
                      >
                        Delete
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
} 