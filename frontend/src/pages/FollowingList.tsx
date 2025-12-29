import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import UserCard from '../components/UserCard';

const API = API_URL.replace(/\/api$/, '');

export default function FollowingList({
  token,
  currentUserId,
  onShowProfile,
  onOpenConversation,
}: any) {
  const [following, setFollowing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listMode, setListMode] = useState<'grid' | 'list'>('grid');
  const [statuses, setStatuses] = useState<Record<string, any>>({});
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!token || !currentUserId) return;
    axios
      .get(`${API}/api/users/${currentUserId}`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      .then((res) => setFollowing(res.data.following || []))
      .finally(() => setLoading(false));
  }, [token, currentUserId]);

  // Load user statuses for harmonized subtitle
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const map: Record<string, any> = {};
        (res.data || []).forEach((s: any) => {
          if (s?.userId) map[String(s.userId)] = s;
        });
        setStatuses(map);
      })
      .catch(() => setStatuses({}));
  }, [token]);

  function avatarUrl(u: any) {
    if (!u?.avatar) return 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff';
    if (u.avatar.startsWith('http')) return u.avatar;
    if (u.avatar.startsWith('/')) return API + u.avatar;
    return API + '/uploads/' + u.avatar;
  }

  async function toggleFollow(u: any) {
    const route = u.isFollowed ? 'unfollow' : 'follow';

    await axios.post(
      `${API}/api/users/${u._id}/${route}`,
      {},
      { headers: { Authorization: 'Bearer ' + token } },
    );

    setFollowing((prev) =>
      prev.map((x) => (x._id === u._id ? { ...x, isFollowed: !u.isFollowed } : x)),
    );
  }

  const filtered = (following || []).filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const hay = [u.username, u.bio, u.sport, u.email].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(q);
  });

  return (
    <div className="themed-page p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-heading flex items-center gap-2">
          <span>Following</span>
          <span className="badge">{filtered.length}</span>
        </h2>

        <select
          value={listMode}
          onChange={(e) => setListMode(e.target.value as any)}
          className="px-3 py-2 rounded-md border bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-theme-secondary pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input
          type="text"
          placeholder="Search following..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full pl-12 pr-4 py-3 rounded-xl"
        />
      </div>

      {loading ? (
        <div className="text-theme-secondary">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-theme-secondary text-center py-12">
          <div className="text-4xl mb-3">➕</div>
          <div>Not following anyone yet.</div>
        </div>
      ) : listMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              mode="grid"
              compact={true}
              isFollowingPage={true}
              userStatus={statuses[String(u._id)]}
              onShowProfile={onShowProfile}
              onOpenConversation={onOpenConversation}
              onToggleFollow={toggleFollow}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              mode="list"
              compact={true}
              isFollowingPage={true}
              userStatus={statuses[String(u._id)]}
              onShowProfile={onShowProfile}
              onOpenConversation={onOpenConversation}
              onToggleFollow={toggleFollow}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
