'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

// Extended type definition for a group
interface Group {
  id: number;
  group_name: string;
  description: string | null;
  signal_group_id: string | null; 
  link_token: string | null; // New
  link_token_expires_at: string | null; // New (ISO String)
  bot_linked_at: string | null; // New (ISO String)
  user_id: number; // New (if needed for later logic or consistency)
  created_at: string; // New (if needed for later logic or consistency)
}

// New interface for the info from the link token API call
interface LinkTokenInfo {
  linkToken: string;
  botNumber: string;
  groupName: string;
  expiresAt: string; // ISO String
}

export default function EditGroupPage() {
  const { token, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const router = useRouter();
  const params = useParams(); // Hook to get route parameters
  const groupId = params.groupId as string; // groupId from the URL

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [originalGroup, setOriginalGroup] = useState<Group | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true); // For loading group data
  const [isSubmitting, setIsSubmitting] = useState(false); // For the submit process

  // New states for Signal link functionality
  const [linkTokenInfo, setLinkTokenInfo] = useState<LinkTokenInfo | null>(null);
  const [isLinking, setIsLinking] = useState(false); // For the loading state of the token fetch
  const [linkError, setLinkError] = useState<string | null>(null); // For errors from the token fetch
  const [refreshKey, setRefreshKey] = useState(0); // To trigger reloading of group data

  // fetchGroupDetails memoized with useCallback
  const fetchGroupDetails = useCallback(async () => {
    if (groupId && token && isAuthenticated) {
      setIsLoadingData(true);
      setError(null);
      // Don't reset LinkError here, it might come from handleGenerateLinkToken
      try {
        const response = await fetch(`/api/groups/${groupId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error loading group details');
        }
        const data: Group = await response.json();
        setOriginalGroup(data); // Stores all fields, incl. link_token etc.
        setName(data.group_name);
        setDescription(data.description || '');

        // Logic to initialize/reset linkTokenInfo based on the group's state
        if (data.signal_group_id && data.bot_linked_at) {
          // Group is linked, don't show token info
          setLinkTokenInfo(null); 
        } else if (data.link_token && data.link_token_expires_at) {
          // Group has an active token (from backend), but linkTokenInfo is not yet set (e.g., after page refresh)
          // Don't automatically show this existing token as "generated", as the user might want a new one.
          // The UI shows the state based on originalGroup.link_token.
          // setLinkTokenInfo is only set by explicit generation.
          // So here: setLinkTokenInfo(null) if not explicitly generated.
          // This is handled by the later JSX logic that checks originalGroup.link_token.
        } else {
            // No active token or already linked, so don't show token infos from previous generation attempt
            setLinkTokenInfo(null);
        }

      } catch (err: any) {
        setError(err.message);
        setOriginalGroup(null); // On error, ensure no outdated data is displayed
      } finally {
        setIsLoadingData(false);
      }
    }
  }, [groupId, token, isAuthenticated]);

  useEffect(() => {
    if (!authIsLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authIsLoading, isAuthenticated, router]);

  // Call fetchGroupDetails if dependencies change or refreshKey changes
  useEffect(() => {
    fetchGroupDetails();
  }, [fetchGroupDetails, refreshKey]);

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
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          group_name: name, 
          description: description, 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error updating group');
      }
      router.push('/dashboard/groups');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to generate the link token
  const handleGenerateLinkToken = async () => {
    setIsLinking(true);
    setLinkError(null);
    setLinkTokenInfo(null); // Reset previous infos
    try {
      const response = await fetch(`/api/groups/${groupId}/link-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json(); // Always call response.json(), even on error
      if (!response.ok) {
        throw new Error(data.message || 'Error generating link token');
      }
      setLinkTokenInfo(data); // Stores { linkToken, botNumber, groupName, expiresAt }
      // The page doesn't necessarily need to be reloaded immediately, as linkTokenInfo now controls the UI.
      // A reload via setRefreshKey would update originalGroup.link_token, which is good.
      setRefreshKey(prev => prev + 1); 
    } catch (err: any) {
      setLinkError(err.message);
    } finally {
      setIsLinking(false);
    }
  };
  
  // Helper to format date (will be needed later)
  const formatDate = (isoDateString: string | null) => {
    if (!isoDateString) return 'N/A';
    try {
      return new Date(isoDateString).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });
    } catch (e) {
      return 'Invalid date';
    }
  };

  if (authIsLoading || isLoadingData) {
    return (
      <section className="section">
        <div className="container has-text-centered">
          <p className="title is-4">Loading group data...</p>
          <progress className="progress is-small is-primary" max="100"></progress>
        </div>
      </section>
    );
  }

  if (error && !originalGroup) { // Error during initial load
    return (
      <section className="section">
        <div className="container">
          <div className="notification is-danger">
            <p>Error: {error}</p>
            <Link href="/dashboard/groups" className="button is-light mt-3">Back to overview</Link>
          </div>
        </div>
      </section>
    );
  }

  if (!originalGroup) { // Shouldn't happen if no error, but just in case
      return (
        <section className="section">
          <div className="container">
            <p>Group not found or access denied.</p>
            <Link href="/dashboard/groups" className="button is-light mt-3">Back to overview</Link>
          </div>
        </section>
      );
  }

  // Logic for link UI
  let signalLinkSectionContent;
  if (originalGroup.signal_group_id && originalGroup.bot_linked_at) {
    signalLinkSectionContent = (
      <div className="notification is-success is-light">
        <p className="has-text-weight-bold">Successfully linked with Signal!</p>
        <p>Signal Group ID: <code style={{wordBreak: 'break-all'}}>{originalGroup.signal_group_id}</code></p>
        <p>Linked on: {formatDate(originalGroup.bot_linked_at)}</p>
        {/* Optional: Button to unlink or re-link */}
        <button className={`button is-link is-outlined mt-3 ${isLinking ? 'is-loading' : ''}`} onClick={handleGenerateLinkToken} disabled={isLinking}>
          Relink (generates new token)
        </button>
      </div>
    );
  } else if (linkTokenInfo) { // State after clicking "Generate Token", info comes from linkTokenInfo state
    signalLinkSectionContent = (
      <div className="notification is-info is-light">
        <p className="has-text-weight-bold">Linking process started:</p>
        <ol className="mt-2 mb-3 pl-4" style={{ listStyleType: 'decimal' }}>
          <li className="mb-1">Invite the bot (Tel: <span className="has-text-weight-bold">{linkTokenInfo.botNumber || process.env.NEXT_PUBLIC_BOT_PHONE_NUMBER || '[Bot phone no. missing]'}</span>) to your desired Signal group (if not already done).</li>
          <li className="mb-1">Send the following exact message to this Signal group:</li>
          <pre className="is-size-6 my-2 p-2 has-background-white-ter" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>!link {linkTokenInfo.linkToken}</pre>
          <li>This token is valid until: {formatDate(linkTokenInfo.expiresAt)}.</li>
        </ol>
        <p className="is-size-7">After sending the message, the linking should occur automatically. You can update the status below.</p>
        <div className="field is-grouped mt-3">
            <div className="control">
                <button className="button is-info is-outlined" onClick={() => setRefreshKey(prev => prev + 1)} disabled={isLoadingData || isLinking}>
                    Update status
                </button>
            </div>
            <div className="control">
                <button className={`button is-link ${isLinking ? 'is-loading' : ''}`} onClick={handleGenerateLinkToken} disabled={isLinking}>
                Generate new token
                </button>
            </div>
        </div>
      </div>
    );
  } else if (originalGroup.link_token && originalGroup.link_token_expires_at) {
    // State: Token in DB (originalGroup), but not freshly generated (linkTokenInfo is null)
    signalLinkSectionContent = (
      <div className="notification is-warning is-light">
        <p className="has-text-weight-bold">Linking pending:</p>
        <p className="is-size-7">A token has already been generated, but linking is not yet complete.</p>
        <ol className="mt-2 mb-3 pl-4" style={{ listStyleType: 'decimal' }}>
           <li className="mb-1">Ensure the bot (Tel: <span className="has-text-weight-bold">{process.env.NEXT_PUBLIC_BOT_PHONE_NUMBER || '[Bot phone no. missing]'}</span>) is in your Signal group.</li>
          <li className="mb-1">Send the following exact message to this Signal group:</li>
          <pre className="is-size-6 my-2 p-2 has-background-white-ter" style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all'}}>!link {originalGroup.link_token}</pre>
          <li className="mb-1">This token is valid until: {formatDate(originalGroup.link_token_expires_at)}.</li>
        </ol>
        <div className="field is-grouped mt-3">
            <div className="control">
                <button className="button is-warning is-outlined" onClick={() => setRefreshKey(prev => prev + 1)} disabled={isLoadingData || isLinking}>
                    Update status
                </button>
            </div>
            <div className="control">
                <button className={`button is-link ${isLinking ? 'is-loading' : ''}`} onClick={handleGenerateLinkToken} disabled={isLinking}>
                Generate new token (overwrites old one)
                </button>
            </div>
        </div>
      </div>
    );
  } else {
    // Initial state: No link, no token
    signalLinkSectionContent = (
      <div>
        <p>This group is not yet linked with a Signal group.</p>
        <button className={`button is-link mt-3 ${isLinking ? 'is-loading' : ''}`} onClick={handleGenerateLinkToken} disabled={isLinking || isLoadingData}>
          Link with Signal group
        </button>
      </div>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="is-flex is-justify-content-space-between is-align-items-center mb-4">
            <h1 className="title mb-0">Edit Group: {originalGroup.group_name}</h1>
            <Link href="/dashboard/groups" className="button is-light">
                Back to overview
            </Link>
        </div>
        
        <div className="columns">
            <div className="column is-two-thirds">
                <div className="box">
                    <h2 className="subtitle">Basic Settings</h2>
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
                            <input id="groupName" className="input" type="text" placeholder="Name of the group" value={name} onChange={(e) => setName(e.target.value)} required />
                        </div>
                        </div>
                        <div className="field">
                        <label htmlFor="groupDescription" className="label">Description (optional)</label>
                        <div className="control">
                            <textarea id="groupDescription" className="textarea" placeholder="A short description of the group" value={description} onChange={(e) => setDescription(e.target.value)}></textarea>
                        </div>
                        </div>
                        <div className="field is-grouped mt-5">
                        <div className="control">
                            <button 
                            type="submit" 
                            className={`button is-primary ${isSubmitting ? 'is-loading' : ''}`}
                            disabled={isSubmitting || isLoadingData}
                            >
                            Save Changes
                            </button>
                        </div>
                        <div className="control">
                            <Link href={`/dashboard/groups/${groupId}/webhooks`} className="button is-info is-outlined">
                                Manage Webhooks
                            </Link>
                        </div>
                        </div>
                    </form>
                </div>
            </div>
            <div className="column is-one-third">
                <div className="box">
                    <h2 className="subtitle">Signal Link</h2>
                    {isLoadingData && !originalGroup.signal_group_id && !originalGroup.link_token ? (
                        <div className="has-text-centered">
                            <p>Loading link status...</p>
                            <progress className="progress is-small is-info mt-2" max="100"></progress>
                        </div>
                    ) : signalLinkSectionContent}
                    {linkError && (
                        <div className="notification is-danger is-light mt-3">
                            <button className="delete" onClick={() => setLinkError(null)}></button>
                            {linkError}
                        </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    </section>
  );
} 