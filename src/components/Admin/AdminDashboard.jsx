import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Users, Mail, Clock, Shield, Activity, MessageSquare, Zap, RefreshCw, Key, CheckCircle, XCircle } from 'lucide-react';
import { isAdmin, fetchAllUsers, grantApiAccess, revokeApiAccess } from '../../config/admin';

/**
 * Admin Dashboard — shows all users who have signed up.
 * Only visible to admin accounts (verified via Firebase Custom Claims).
 */
export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Fetch users from Cloud Function
  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const fetchedUsers = await fetchAllUsers();
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch users:', err);
      setError('Failed to load users. Make sure Cloud Functions are deployed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGrantAccess(uid) {
    setActionLoading(uid);
    try {
      await grantApiAccess(uid);
      // Update local state
      setUsers(users.map(u => u.uid === uid ? { ...u, apiAccess: true } : u));
    } catch (err) {
      console.error('Failed to grant access:', err);
      alert('Failed to grant API access');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevokeAccess(uid) {
    setActionLoading(uid);
    try {
      await revokeApiAccess(uid);
      // Update local state
      setUsers(users.map(u => u.uid === uid ? { ...u, apiAccess: false } : u));
    } catch (err) {
      console.error('Failed to revoke access:', err);
      alert('Failed to revoke API access');
    } finally {
      setActionLoading(null);
    }
  }

  // Calculate totals
  const totalMessages = users.reduce((sum, u) => sum + (u.totalMessages || 0), 0);
  const totalTokens = users.reduce((sum, u) => sum + (u.totalTokens || 0), 0);
  const proUsers = users.filter(u => u.subscription === 'pro').length;
  const usersWithAccess = users.filter(u => u.apiAccess).length;

  // Safety check - shouldn't render if not admin, but just in case
  if (!isAdmin(user)) {
    return (
      <div className="admin-dashboard">
        <div className="admin-unauthorized">
          <Shield className="w-12 h-12 text-red-500" />
          <h2>Access Denied</h2>
          <p>You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-header__top">
          <div className="admin-header__title">
            <Shield className="w-5 h-5 text-accent" />
            <h1>Admin Dashboard</h1>
          </div>
          <button 
            onClick={loadUsers} 
            className="admin-refresh-btn"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="admin-header__subtitle">Manage and monitor your users</p>
      </header>

      {/* Error State */}
      {error && (
        <div className="admin-error">
          <p>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="admin-loading">
          <RefreshCw className="w-6 h-6 animate-spin text-accent" />
          <p>Loading users...</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--blue">
            <Users className="w-5 h-5" />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__number">{users.length}</span>
            <span className="admin-stat-card__label">Total Users</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--green">
            <Activity className="w-5 h-5" />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__number">
              {users.filter(u => {
                const lastLogin = new Date(u.lastLogin);
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return lastLogin > dayAgo;
              }).length}
            </span>
            <span className="admin-stat-card__label">Active Today</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--purple">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__number">{totalMessages.toLocaleString()}</span>
            <span className="admin-stat-card__label">AI Requests</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--orange">
            <Zap className="w-5 h-5" />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__number">{formatTokens(totalTokens)}</span>
            <span className="admin-stat-card__label">Tokens Used</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--gold">
            <Shield className="w-5 h-5" />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__number">{proUsers}</span>
            <span className="admin-stat-card__label">Pro Users</span>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__icon admin-stat-card__icon--teal">
            <Key className="w-5 h-5" />
          </div>
          <div className="admin-stat-card__content">
            <span className="admin-stat-card__number">{usersWithAccess}</span>
            <span className="admin-stat-card__label">API Access</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <section className="admin-section">
        <h2 className="admin-section__title">
          <Users className="w-4 h-4" />
          All Users
        </h2>
        
        {users.length === 0 ? (
          <div className="admin-empty">
            <p>No users have signed up yet.</p>
          </div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>AI Requests</th>
                  <th>Tokens</th>
                  <th>Last Active</th>
                  <th>Status</th>
                  <th>API Access</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.uid}>
                    <td>
                      <div className="admin-user-cell">
                        {u.photoURL ? (
                          <img src={u.photoURL} alt={u.displayName || 'User'} className="admin-avatar" />
                        ) : (
                          <div className="admin-avatar admin-avatar--placeholder">
                            {u.displayName?.[0] || u.email?.[0] || '?'}
                          </div>
                        )}
                        <span className="admin-user-name">{u.displayName || 'Anonymous'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-email-cell">
                        <Mail className="w-3.5 h-3.5" />
                        <span>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-metric-cell">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{u.totalMessages || 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-metric-cell">
                        <Zap className="w-3.5 h-3.5" />
                        <span>{formatTokens(u.totalTokens || 0)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="admin-date-cell">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{formatDate(u.lastLogin)}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`admin-status ${u.subscription === 'pro' ? 'admin-status--pro' : 'admin-status--free'}`}>
                        {u.subscription === 'pro' ? 'Pro' : 'Free'}
                      </span>
                      {u.isAdmin && (
                        <span className="admin-status admin-status--admin ml-1">
                          Admin
                        </span>
                      )}
                    </td>
                    <td>
                      {u.apiAccess ? (
                        <div className="admin-access-cell">
                          <span className="admin-status admin-status--access">
                            <CheckCircle className="w-3 h-3" />
                            Granted
                          </span>
                          {!u.isAdmin && (
                            <button
                              onClick={() => handleRevokeAccess(u.uid)}
                              disabled={actionLoading === u.uid}
                              className="admin-action-btn admin-action-btn--revoke"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="admin-access-cell">
                          <span className="admin-status admin-status--no-access">
                            <XCircle className="w-3 h-3" />
                            No Access
                          </span>
                          <button
                            onClick={() => handleGrantAccess(u.uid)}
                            disabled={actionLoading === u.uid}
                            className="admin-action-btn admin-action-btn--grant"
                          >
                            Grant
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Format date for display */
function formatDate(value) {
  if (!value) return '—';
  
  let date;
  
  // Handle Firestore timestamp objects
  if (typeof value === 'object' && value._seconds) {
    date = new Date(value._seconds * 1000);
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else if (value instanceof Date) {
    date = value;
  } else {
    return '—';
  }
  
  // Check if date is valid
  if (isNaN(date.getTime())) {
    return '—';
  }
  
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return format(date, 'MMM d, yyyy');
}

/** Format tokens with K/M suffix */
function formatTokens(tokens) {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return tokens.toString();
}
