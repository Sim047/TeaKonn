// frontend/src/components/GroupChatsList.tsx
import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { API_URL } from '../config/api';
import { socket } from '../socket';

dayjs.extend(relativeTime);

const API = API_URL.replace(/\/api$/, '');

type GroupChatsListProps = {
  token: string | null;
  onOpenRoom: (roomId: string) => void;
};

export default function GroupChatsList({ token, onOpenRoom }: GroupChatsListProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [query, setQuery] = useState<string>('');

  useEffect(() => {
    if (!token) return;
    loadGroups();
    const poll = window.setInterval(loadGroups, 30000);
    const handler = () => loadGroups();
    try {
      socket?.on('receive_message', handler);
      socket?.on('message_deleted', handler);
      socket?.on('messages_bulk_deleted', handler);
    } catch {}
    return () => {
      window.clearInterval(poll);
      try {
        socket?.off('receive_message', handler);
        socket?.off('message_deleted', handler);
        socket?.off('messages_bulk_deleted', handler);
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function loadGroups() {
    if (!token) return;
    try {
      setLoading(true);
      const joinedRes = await axios.get(`${API}/api/events/my/joined`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const joined = (joinedRes.data?.events || []).filter((ev: any) => !ev.archivedAt);
      setEvents(joined);
      const ids = joined.map((e: any) => e._id);
      if (ids.length) {
        try {
          const unreadRes = await axios.post(
            `${API}/api/messages/rooms/unread-counts`,
            { rooms: ids },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          setUnread(unreadRes.data || {});
        } catch {
          setUnread({});
        }
      } else {
        setUnread({});
      }
    } catch (e) {
      console.warn('GroupChatsList: failed to load groups');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events;
    if (q) list = list.filter((e: any) => String(e.title || '').toLowerCase().includes(q));
    // Sort: unread desc, then by startDate desc
    return [...list].sort((a: any, b: any) => {
      const ua = unread[a._id] || 0;
      const ub = unread[b._id] || 0;
      if (ua !== ub) return ub - ua;
      const ta = new Date(a.startDate || 0).getTime();
      const tb = new Date(b.startDate || 0).getTime();
      return tb - ta;
    });
  }, [events, unread, query]);

  const totalUnread = useMemo(() => Object.values(unread).reduce((s, n) => s + (n || 0), 0), [unread]);

  return (
    <div className="flex flex-col gap-3">
      {/* Total unread banner */}
      {!loading && filtered.length > 0 && totalUnread > 0 && (
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-center font-semibold shadow-lg ring-1 ring-white/20">
          {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center justify-between gap-2">
        <input
          className="input w-full sm:w-80"
          placeholder="Search group chats"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="text-xs px-3 py-1.5 rounded-md border"
          style={{ borderColor: 'var(--border)' }}
          onClick={() => loadGroups()}
          title="Refresh"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border animate-pulse" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md" style={{ background: 'var(--muted)' }} />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/3 rounded" style={{ background: 'var(--muted)' }} />
                  <div className="h-3 w-1/4 rounded" style={{ background: 'var(--muted)' }} />
                </div>
                <div className="h-8 w-24 rounded" style={{ background: 'var(--muted)' }} />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-600 dark:text-slate-400">
          <div className="text-4xl mb-3">👥</div>
          <div>No active group chats</div>
          <div className="text-xs mt-2">Join events to see their chats here</div>
        </div>
      ) : (
        filtered.map((ev: any) => {
          const count = unread[ev._id] || 0;
          return (
            <div
              key={ev._id}
              className={`
                relative p-3 sm:p-4 rounded-lg bg-white dark:bg-slate-800 border-2 transition-all cursor-pointer
                ${
                  count > 0
                    ? 'border-emerald-400 dark:border-emerald-500 shadow-md shadow-emerald-100 dark:shadow-emerald-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-md'
                }
              `}
              onClick={async () => {
                try { localStorage.setItem('auralink-open-room', ev._id); } catch {}
                // Optimistic mark-as-read
                setUnread((prev) => ({ ...prev, [ev._id]: 0 }));
                try {
                  await axios.post(
                    `${API}/api/messages/rooms/${ev._id}/mark-read`,
                    {},
                    { headers: { Authorization: `Bearer ${token}` } },
                  );
                } catch {}
                onOpenRoom(ev._id);
              }}
              title={ev.title}
            >
              {count > 0 && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                  {count > 99 ? '99+' : count}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md bg-gradient-to-br from-accent to-accent-light text-white font-bold flex items-center justify-center shadow">
                  {dayjs(ev.startDate).format('DD')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`font-bold truncate ${count > 0 ? 'text-cyan-600 dark:text-cyan-400' : ''}`}>
                    {ev.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {dayjs(ev.startDate).format('MMM D, YYYY')}
                    {ev.location?.city ? ` • ${ev.location.city}` : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
