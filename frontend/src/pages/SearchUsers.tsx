// frontend/src/components/SearchUsers.tsx
import React, { useEffect, useState } from 'react';
import { getUserSubtitle } from '../utils/userDisplay';
import axios from 'axios';
import { API_URL } from '../config/api';
import SearchBar from '../components/SearchBar';

const API = API_URL.replace(/\/api$/, '');
const PLACEHOLDER = 'https://placehold.co/48x48?text=U';

export default function SearchUsers({
  token,
  onOpenConversation,
  currentUserId,
  onShowProfile,
}: any) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || q.trim() === '') {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      setLoading(true);
      axios
        .get(API + '/api/users/all?search=' + encodeURIComponent(q), {
          headers: { Authorization: 'Bearer ' + token },
        })
        .then((r) => setResults(r.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q, token]);

  async function startConversation(user: any) {
    if (!token) return;
    try {
      const res = await axios.post(
        API + '/api/conversations',
        { partnerId: user._id },
        { headers: { Authorization: 'Bearer ' + token } },
      );
      onOpenConversation(res.data);
      setQ('');
      setResults([]);
    } catch {
      alert('Could not start conversation');
    }
  }

  function avatarUrl(u: any) {
    if (!u?.avatar) return PLACEHOLDER;
    if (u.avatar.startsWith('http')) return u.avatar;
    if (u.avatar.startsWith('/')) return API + u.avatar;
    return API + '/uploads/' + u.avatar;
  }

  return (
    <div>
      <div className="flex gap-2">
        <div className="flex-1">
          <SearchBar
            value={q}
            onChange={(v) => setQ(v)}
            placeholder="Search users..."
            ariaLabel="Search users"
          />
        </div>
      </div>

      {loading && <div className="text-sm text-muted mt-2">Searching…</div>}

      <div className="mt-3 flex flex-col gap-2">
        {results.map((u) => (
          <div
            key={u._id}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/30 transition cursor-pointer"
          >
            {/* CLICK PROFILE */}
            <img
              src={avatarUrl(u)}
              alt={u.username}
              onClick={() => onShowProfile(u)}
              className="w-9 h-9 rounded-md object-cover"
            />

            <div className="flex-1" onClick={() => onShowProfile(u)}>
              <div className="font-semibold">{u.username}</div>
              {(() => {
                const subtitle = getUserSubtitle(u);
                return subtitle ? <div className="text-xs text-muted">{subtitle}</div> : null;
              })()}
            </div>

            <button className="px-3 py-1 border rounded-md" onClick={() => startConversation(u)}>
              Message
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
