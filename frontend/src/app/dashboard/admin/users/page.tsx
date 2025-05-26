'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface AdminUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  created_at: string;
  group_count: number;
  webhook_count_total: number;
}

export default function AdminUsersPage() {
  const { isAuthenticated, user, isLoading, token } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user?.is_admin)) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    if (isAuthenticated && user?.is_admin && token) {
      const fetchUsers = async () => {
        setIsLoadingData(true);
        setPageError(null);
        try {
          const response = await fetch('/api/admin/users', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Error fetching users');
          }
          const data: AdminUser[] = await response.json();
          setUsers(data);
        } catch (err: any) {
          setPageError(err.message);
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchUsers();
    }
  }, [isAuthenticated, user, token]);

  const handleDeleteUser = async (userId: number, userEmail: string) => {
    if (userId === user?.id) {
        alert("You cannot delete yourself.");
        return;
    }
    if (!window.confirm(`Are you sure you want to delete user ${userEmail}? This action cannot be undone and will also delete all their groups and webhooks.`)) {
      return;
    }
    setPageError(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error deleting user');
      }
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId));
      alert('User deleted successfully.');
    } catch (err: any) {
      setPageError(err.message);
      alert(`Error: ${err.message}`);
    }
  };

  if (isLoading || isLoadingData) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p>Loading user data...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  if (!isAuthenticated || !user?.is_admin) {
    // This case should ideally be handled by the initial redirect, but as a fallback:
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
            <li className="is-active"><a href="#" aria-current="page">User Management</a></li>
          </ul>
        </nav>
        <h1 className="title">User Management</h1>

        {pageError && (
          <div className="notification is-danger is-light">
            <button className="delete" onClick={() => setPageError(null)}></button>
            {pageError}
          </div>
        )}

        {users.length === 0 && !isLoadingData ? (
          <div className="notification is-info">
            <p>No users found.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table is-bordered is-striped is-narrow is-hoverable is-fullwidth">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Is Admin?</th>
                  <th>Registered At</th>
                  <th>Groups</th>
                  <th>Webhooks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.email}</td>
                    <td>{u.is_admin ? 'Yes' : 'No'}</td>
                    <td>{new Date(u.created_at).toLocaleString()}</td>
                    <td>{u.group_count}</td>
                    <td>{u.webhook_count_total}</td>
                    <td>
                      <button 
                        className={`button is-danger is-small ${u.id === user.id ? 'is-disabled' : ''}`}
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        disabled={u.id === user.id}
                        title={u.id === user.id ? "Cannot delete yourself" : "Delete user"}
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