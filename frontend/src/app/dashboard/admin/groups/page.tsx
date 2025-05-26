'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AdminGroup {
  id: number;
  group_name: string;
  description: string | null;
  signal_group_id: string | null;
  bot_phone_number: string | null;
  created_at: string;
  user_id: number;
  user_email: string;
  user_username: string;
  webhook_count: number;
}

export default function AdminGroupsPage() {
  const { isAuthenticated, user, isLoading, token } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<AdminGroup[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.is_admin && token) {
      const fetchGroups = async () => {
        setIsLoadingData(true);
        setPageError(null);
        try {
          const response = await fetch('/api/admin/groups', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error fetching groups');
          }
          const data: AdminGroup[] = await response.json();
          setGroups(data);
        } catch (err: any) {
          setPageError(err.message);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchGroups();
    }
  }, [isAuthenticated, user, token]);

  const handleDeleteGroup = async (groupId: number, groupName: string) => {
    if (!window.confirm(`Are you sure you want to delete group "${groupName}"? This will also delete all associated webhooks.`)) {
      return;
    }
    setPageError(null);
    try {
      const response = await fetch(`/api/admin/groups/${groupId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error deleting group');
      }
      setGroups(prevGroups => prevGroups.filter(g => g.id !== groupId));
      alert('Group deleted successfully.');
    } catch (err: any) {
      setPageError(err.message);
      alert(`Error: ${err.message}`);
    }
  };
  
  if (isLoading || isLoadingData) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p>Loading group data...</p>
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
            <li className="is-active"><a href="#" aria-current="page">Group Management</a></li>
          </ul>
        </nav>
        <h1 className="title">Group Management (All Users)</h1>

        {pageError && (
          <div className="notification is-danger is-light">
            <button className="delete" onClick={() => setPageError(null)}></button>
            {pageError}
          </div>
        )}

        {groups.length === 0 && !isLoadingData ? (
          <div className="notification is-info">
            <p>No groups found in the system.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table is-bordered is-striped is-narrow is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Owner (User)</th>
                  <th>Signal Group ID</th>
                  <th>Webhooks</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>{g.group_name}</td>
                    <td>{g.user_username} ({g.user_email})</td>
                    <td>{g.signal_group_id || '-'}</td>
                    <td>{g.webhook_count}</td>
                    <td>{new Date(g.created_at).toLocaleString()}</td>
                    <td>
                      <button 
                        className="button is-danger is-small"
                        onClick={() => handleDeleteGroup(g.id, g.group_name)}
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