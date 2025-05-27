'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

interface Group {
  id: number;
  group_name: string;
  description: string | null;
  signal_group_id: string | null;
  bot_phone_number: string | null;
  created_at: string;
  user_id: number;
  // Potentially other fields like webhook_count if the API provides it directly
}

// Simple interface for Webhook, focusing on what might be displayed or counted
interface Webhook {
  id: number;
  // other fields like description, is_active etc.
}

export default function DashboardPage() {
  const { isAuthenticated, user, isLoading, token } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [totalWebhooks, setTotalWebhooks] = useState<number>(0);
  const [dataError, setDataError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    console.log('[DashboardPage] Auth isLoading:', isLoading);
    console.log('[DashboardPage] isAuthenticated:', isAuthenticated);
    console.log('[DashboardPage] User object:', user);
  }, [user, isAuthenticated, isLoading]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (isAuthenticated && token) {
        setIsLoadingData(true);
        setDataError(null);
        try {
          const groupsResponse = await fetch('/api/groups', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!groupsResponse.ok) {
            const errorData = await groupsResponse.json();
            throw new Error(errorData.message || 'Error fetching groups');
          }
          const groupsData: Group[] = await groupsResponse.json();
          setGroups(groupsData);

          let webhooksCount = 0;
          for (const group of groupsData) {
            const webhooksResponse = await fetch(`/api/groups/${group.id}/webhooks`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });
            if (webhooksResponse.ok) {
              const webhooksData: Webhook[] = await webhooksResponse.json();
              webhooksCount += webhooksData.length;
            } else {
              console.warn(`Could not fetch webhooks for group ${group.id}`);
            }
          }
          setTotalWebhooks(webhooksCount);

        } catch (err: unknown) {
          if (err instanceof Error) {
            setDataError(err.message);
          } else if (typeof err === 'string') {
            setDataError(err);
          } else {
            setDataError('An unexpected error occurred while fetching dashboard data.');
          }
        } finally {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();
  }, [isAuthenticated, token]);

  if (isLoading || (!isAuthenticated && isLoadingData)) {
    return (
      <div className="container has-text-centered section">
        <p className="is-size-4">Loading dashboard...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="container section" style={{ backgroundColor: 'var(--background-color)' }}>
      <div className="box" style={{ backgroundColor: 'white', boxShadow: '0 2px 3px rgba(10, 10, 10, 0.1), 0 0 0 1px rgba(10, 10, 10, 0.1)' }}>
        <h1 className="title is-2 has-text-centered" style={{ color: 'var(--pastel-lilac)' }}>
          Welcome to the Signalcow-Dashboard, {user?.username || user?.email}!
        </h1>
        {dataError && (
          <div className="notification is-danger is-light mt-4">
            <button className="delete" onClick={() => setDataError(null)}></button>
            {dataError}
          </div>
        )}
      </div>

      <div className="box mt-5" style={{ backgroundColor: 'var(--pastel-light-lilac)', borderLeft: '5px solid var(--pastel-lilac)' }}>
        <header
          className="is-clickable"
          onClick={() => setIsGuideOpen(!isGuideOpen)}
          style={{ cursor: 'pointer' }}
          aria-expanded={isGuideOpen}
          aria-controls="webhook-guide-content"
        >
          <div className="level is-mobile">
            <div className="level-left">
              <h2 className="title is-4 mb-0 level-item" style={{ color: 'var(--text-color)' }}>Webhook Creation Guide</h2>
            </div>
            <div className="level-right">
              <span className="icon is-medium level-item">
                <i className={`fas ${isGuideOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ color: 'var(--text-color)' }}></i>
              </span>
            </div>
          </div>
        </header>
        {isGuideOpen && (
          <div id="webhook-guide-content" className="content mt-3">
            <ol style={{ color: 'var(--text-color)' }}>
              <li className="mb-3">
                <strong style={{ color: 'var(--pastel-lilac)' }}>1. Navigate to the &quot;Groups&quot; section:</strong>
                <p>Click on the &quot;Groups&quot; menu item in the navigation bar.</p>
              </li>
              <li className="mb-3">
                <strong style={{ color: 'var(--pastel-lilac)' }}>2. Select a group or create a new one:</strong>
                <p>You will see a list of your existing groups. You can select one for which you want to create a webhook, or create a new group.</p>
              </li>
              <li className="mb-3">
                <strong style={{ color: 'var(--pastel-lilac)' }}>3. Access the group&apos;s webhook management:</strong>
                <p>Within the detail view of a group, you will find options to manage webhooks (e.g., a tab or a button &quot;Manage Webhooks&quot;).</p>
              </li>
              <li className="mb-3">
                <strong style={{ color: 'var(--pastel-lilac)' }}>4. Create a new webhook:</strong>
                <p>Click on &quot;Create New Webhook&quot;. A form will open.</p>
              </li>
              <li className="mb-3">
                <strong style={{ color: 'var(--pastel-lilac)' }}>5. Configure the webhook:</strong>
                <ul className="list" style={{ marginLeft: '1.5em', listStyleType: 'disc', paddingLeft: '20px' }}>
                  <li><strong>Name:</strong> Enter a descriptive name for your webhook.</li>
                  <li><strong>Event Type:</strong> Choose the event that should trigger the webhook (e.g., &quot;New message received&quot;, &quot;Member joined&quot;).</li>
                  <li><strong>Target URL:</strong> Enter the URL of your service that will receive the webhook data. This URL must be publicly accessible.</li>
                  <li><strong>(Optional) Secret Key:</strong> For added security, you can specify a secret key. This will be used to sign the requests so your service can verify their authenticity.</li>
                </ul>
              </li>
              <li className="mb-3">
                <strong style={{ color: 'var(--pastel-lilac)' }}>6. Save:</strong>
                <p>After entering all required information, save the webhook.</p>
              </li>
              <li>
                <strong style={{ color: 'var(--pastel-lilac)' }}>7. Test (Recommended):</strong>
                <p>Many systems offer a way to send test notifications to the webhook. Use this feature to ensure your integration is working correctly.</p>
              </li>
            </ol>
          </div>
        )}
      </div>

      <div className="columns is-multiline mt-5">
        <div className="column is-one-third">
          <div className="box has-text-centered" style={{ backgroundColor: 'var(--pastel-blue)', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p className="title is-4" style={{ color: 'var(--text-color)' }}>Groups</p>
              <p className="subtitle is-6" style={{ color: 'var(--text-color-light)' }}>Manage your Signal groups. ({isLoadingData ? '...' : groups.length})</p>
            </div>
            <Link href="/dashboard/groups" className="button is-primary mt-3" style={{ backgroundColor: 'var(--pastel-lilac)', borderColor: 'var(--pastel-lilac)' }}>
              View Groups
            </Link>
          </div>
        </div>
        <div className="column is-one-third">
          <div className="box has-text-centered" style={{ backgroundColor: 'var(--pastel-green)', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <p className="title is-4" style={{ color: 'var(--text-color)' }}>Webhooks</p>
              <p className="subtitle is-6" style={{ color: 'var(--text-color-light)' }}>Total configured webhooks. ({isLoadingData ? '...' : totalWebhooks})</p>
            </div>
            <Link 
              href={!isLoadingData && groups.length === 1 && groups[0] ? `/dashboard/groups/${groups[0].id}/webhooks` : "/dashboard/groups"}
              className={`button is-primary mt-3 ${isLoadingData && 'is-disabled'}`}
              style={{ backgroundColor: 'var(--pastel-lilac)', borderColor: 'var(--pastel-lilac)' }}
              aria-disabled={isLoadingData}
            >
              View Webhooks
            </Link>
          </div>
        </div>
        {user?.is_admin && (
          <div className="column is-one-third">
            <div className="box has-text-centered" style={{ backgroundColor: 'var(--pastel-yellow)', minHeight: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <p className="title is-4" style={{ color: 'var(--text-color)' }}>Admin Panel</p>
                <p className="subtitle is-6" style={{ color: 'var(--text-color-light)' }}>Access administrative tools.</p>
              </div>
              <Link href="/dashboard/admin" className="button is-primary mt-3" style={{ backgroundColor: 'var(--pastel-lilac)', borderColor: 'var(--pastel-lilac)' }}>
                Admin Area
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 