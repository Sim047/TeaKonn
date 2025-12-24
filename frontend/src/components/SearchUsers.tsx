// frontend/src/components/SearchUsers.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const API = API_URL.replace(/\/api$/, '');
const PLACEHOLDER = 'https://placehold.co/48x48?text=U';

export default function SearchUsers({
  token,
  onOpenConversation,
  onOpenProfile,
  currentUserId,
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
        .get(API + '/api/users/all', {
          params: { search: q },
          headers: { Authorization: 'Bearer ' + token },
        })
        .then((r) => {
          const data = r.data || [];
          // Filter results client-side to ensure search works
          const filtered = data.filter((u: any) => {
            const searchLower = q.toLowerCase();
            return (
              u.username?.toLowerCase().includes(searchLower) ||
              (u.status || '').toLowerCase().includes(searchLower)
            );
          });
          setResults(filtered);
        })
        .catch((e) => {
          console.error('search users err', e);
          setResults([]);
        })
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
    } catch (err) {
      console.error('could not start conversation', err);
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
      <div className="flex flex-col gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users..."
          className="input w-full"
        />
      </div>

      {loading && <div className="text-sm text-muted mt-2">Searching…</div>}

      <div className="mt-3 flex flex-col gap-2">
        {results.map((u) => (
          <div
            key={u._id}
            className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-800/20 cursor-pointer"
          >
            {/* CLICK → Open profile popup */}
            <img
              src={avatarUrl(u)}
              alt={u.username}
              className="w-9 h-9 rounded-md object-cover"
              onClick={() => onOpenProfile(u)}
            />

            <div className="flex-1" onClick={() => onOpenProfile(u)}>
              <div className="font-semibold">{u.username}</div>
              <div className="text-xs text-muted">
                {u.status || (u.username ? `@${u.username}` : '')}
              </div>
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
