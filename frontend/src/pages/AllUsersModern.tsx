// frontend/src/pages/AllUsersModern.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { MessageCircle, UserPlus, UserMinus, X, Grid, List, Star } from 'lucide-react';

const API = API_URL.replace(/\/api$/, '');

type User = {
  _id: string;
  username?: string;
  email?: string;
  avatar?: string;
  isFollowed?: boolean;
  bio?: string;
  sport?: string;
  followers?: number;
  following?: number;
};

export default function AllUsersModern({
  token,
  onOpenConversation,
  currentUserId,
  onShowProfile,
}: any) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [statuses, setStatuses] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!token) return;
    loadUsers();
  }, [token]);

  async function loadUsers(q = '') {
    try {
      setLoading(true);

      const url = `${API}/api/users/all${q ? '?search=' + encodeURIComponent(q) : ''}`;

      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const normalized = (res.data || []).map((u: any) => ({
        ...(u || {}),
        isFollowed: !!u.isFollowed,
      }));

      setUsers(normalized);
    } catch (err) {
      console.error('AllUsers load err', err);
    } finally {
      setLoading(false);
    }
  }

  // Load user statuses to display instead of emails
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        const map: Record<string, any> = {};
        (r.data || []).forEach((st: any) => {
          const uid = String(st.user?._id || st.user);
          map[uid] = st;
        });
        setStatuses(map);
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!token) return;
      loadUsers(search);
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  function avatarUrl(u: any) {
    if (!u?.avatar)
      return `https://ui-avatars.com/api/?name=${u?.username || 'User'}&background=0D8ABC&color=fff`;
    if (u.avatar.startsWith('http')) return u.avatar;
    if (u.avatar.startsWith('/')) return API + u.avatar;
    return API + '/uploads/' + u.avatar;
  }

  async function startConversation(user: User) {
    if (!token) return;
    setProcessingId(user._id);

    try {
      const res = await axios.post(
        API + '/api/users/conversations/start',
        { partnerId: user._id },
        { headers: { Authorization: 'Bearer ' + token } },
      );

      onOpenConversation(res.data);
    } catch (err) {
      console.error('startConversation error', err);
    } finally {
      setProcessingId(null);
    }
  }

  async function followToggle(user: User, follow: boolean) {
    if (!token) return;
    setProcessingId(user._id);

    try {
      const url = `${API}/api/users/${user._id}/${follow ? 'follow' : 'unfollow'}`;

      await axios.post(url, {}, { headers: { Authorization: 'Bearer ' + token } });

      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isFollowed: follow } : u)));
    } catch (err) {
      console.error('followToggle error', err);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="min-h-screen themed-page">
      {/* Header */}
      <div className="sticky top-0 z-10 themed-sticky">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-heading">All Users</h1>

            <div className="flex items-center gap-2">
              <div className="flex rounded-lg p-1 themed-card">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'themed-card' : ''}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'themed-card' : ''}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input w-full pl-4 pr-10 py-3 rounded-xl"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-5 h-5 text-theme-secondary" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div
            className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="rounded-2xl p-4 animate-pulse themed-card">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full" style={{ background: 'var(--muted)' }} />
                  <div className="flex-1">
                    <div className="h-4 rounded w-20 mb-1" style={{ background: 'var(--muted)' }} />
                    <div className="h-3 rounded w-12" style={{ background: 'var(--muted)' }} />
                  </div>
                </div>
                <div className="h-8 rounded-lg" style={{ background: 'var(--muted)' }} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`grid ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'} gap-4`}
          >
            {users.map((user) => (
              <UserCard
                key={user._id}
                user={user}
                viewMode={viewMode}
                avatarUrl={avatarUrl(user)}
                onMessage={() => startConversation(user)}
                onFollow={() => followToggle(user, !user.isFollowed)}
                onViewProfile={() => onShowProfile && onShowProfile(user)}
                userStatus={statuses[String(user._id)]}
                isProcessing={processingId === user._id}
                isCurrentUser={user._id === currentUserId}
              />
            ))}
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
}

// User Card Component
function UserCard({
  user,
  viewMode,
  avatarUrl,
  onMessage,
  onFollow,
  onViewProfile,
  userStatus,
  isProcessing,
  isCurrentUser,
}: any) {
  if (viewMode === 'list') {
    return (
      <div className="rounded-2xl p-3 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] themed-card">
        <div className="flex items-center gap-3">
          <img
            src={avatarUrl}
            alt={user.username}
            className="w-12 h-12 rounded-full object-cover ring-2 ring-teal-500/20 cursor-pointer shrink-0"
            onClick={onViewProfile}
          />

          {!isCurrentUser && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onMessage}
                disabled={isProcessing}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-300 disabled:opacity-50"
                title="Message"
              >
                <MessageCircle className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </button>

              <button
                onClick={onFollow}
                disabled={isProcessing}
                className={`p-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${
                  user.isFollowed
                    ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 shadow-lg shadow-teal-500/30'
                }`}
                title={user.isFollowed ? 'Unfollow' : 'Follow'}
              >
                {user.isFollowed ? (
                  <UserMinus className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                ) : (
                  <UserPlus className="w-4 h-4 text-white" />
                )}
              </button>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3
                className="font-semibold text-heading truncate cursor-pointer hover:text-teal-500 transition text-sm"
                onClick={onViewProfile}
              >
                {user.username}
              </h3>
              {user.verified && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
              )}
            </div>
            <p className="text-xs text-theme-secondary truncate">
              {user.bio ||
                (userStatus
                  ? `${userStatus.emoji ? userStatus.emoji + ' ' : ''}${userStatus.mood || 'Status set'}`
                  : 'No status')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Grid view - actions inline beside avatar
  return (
    <div className="rounded-2xl p-3 hover:shadow-xl transition-all duration-300 group hover:scale-[1.02] themed-card">
      <div className="flex items-center gap-3">
        <img
          src={avatarUrl}
          alt={user.username}
          className="w-12 h-12 rounded-full object-cover ring-2 ring-teal-500/20 cursor-pointer group-hover:scale-110 transition-transform duration-300"
          onClick={onViewProfile}
        />

        {!isCurrentUser && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onMessage}
              disabled={isProcessing}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-300 disabled:opacity-50"
              title="Message"
            >
              <MessageCircle className="w-4 h-4" />
            </button>

            <button
              onClick={onFollow}
              disabled={isProcessing}
              className={`p-2 rounded-xl transition-all duration-300 disabled:opacity-50 ${
                user.isFollowed
                  ? 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-teal-500/30'
              }`}
              title={user.isFollowed ? 'Unfollow' : 'Follow'}
            >
              {user.isFollowed ? (
                <UserMinus className="w-4 h-4" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className="font-semibold text-heading truncate cursor-pointer hover:text-teal-500 transition text-sm"
              onClick={onViewProfile}
            >
              {user.username}
            </h3>
            {user.verified && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
          </div>

          {user.sport && (
            <p className="text-xs text-teal-600 dark:text-teal-400 font-medium truncate">{user.sport}</p>
          )}

          <p className="text-xs text-theme-secondary truncate">
            {user.bio ||
              (userStatus
                ? `${userStatus.emoji ? userStatus.emoji + ' ' : ''}${userStatus.mood || 'Status set'}`
                : 'No status')}
          </p>
        </div>
      </div>
    </div>
  );
}
