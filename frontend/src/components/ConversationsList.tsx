// frontend/src/components/ConversationsList.tsx
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import Avatar from './Avatar';
import { Trash2, MessageSquareOff, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { socket } from '../socket';

dayjs.extend(relativeTime);

const API = API_URL.replace(/\/api$/, '');
const PLACEHOLDER = 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff';

export default function ConversationsList({
  token,
  onOpenConversation,
  currentUserId,
  onShowProfile,
  onlineUsers,
}: any) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<string>('');
  const [showAll, setShowAll] = useState<boolean>(false);
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const refreshTimer = React.useRef<number | null>(null);
  const pollingTimer = React.useRef<number | null>(null);
  const [longPressFor, setLongPressFor] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const [showLongPressHint, setShowLongPressHint] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('auralink-hint-conversations-longpress');
    } catch {
      return true;
    }
  });

  function updateConversations(list: any[]) {
    setConversations(list);
    const total = list.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
    setTotalUnread(total);
  }

  // Debug banner for WebView: show API URL, token presence, user id
  const [showDebugBanner, setShowDebugBanner] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem('dm-debug-banner-dismissed') === 'true';
      const inWebView = typeof window !== 'undefined' && (window as any).ReactNativeWebView;
      const debugEnabled = localStorage.getItem('DEBUG_WEBVIEW') === 'true';
      return inWebView && debugEnabled && !dismissed;
    } catch {
      return false;
    }
  });
  const debugInfo = React.useMemo(() => {
    try {
      const tokenSet = !!localStorage.getItem('token');
      const userRaw = localStorage.getItem('user') || '{}';
      const u = JSON.parse(userRaw);
      const uid = u?._id || u?.id || '';
      return { api: API || '', token: tokenSet ? 'present' : 'missing', userId: uid || 'unset' };
    } catch {
      return { api: API || '', token: 'unknown', userId: 'unknown' };
    }
  }, []);

  // Cache TTL in ms (2 minutes)
  const CACHE_KEY = 'auralink-conversations-cache';
  const CACHE_TTL = 2 * 60 * 1000;

  useEffect(() => {
    if (!token) return;
    // Show cached conversations instantly for perceived performance
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        const list = Array.isArray(cached?.data)
          ? cached.data
          : Array.isArray(cached)
            ? cached
            : [];
        const sorted = sortConversations(list);
        setConversations(sorted);
        setTotalUnread(sorted.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0));
        const age = cached?.ts ? Date.now() - cached.ts : CACHE_TTL + 1;
        if (age <= CACHE_TTL) {
          // Fresh cache; skip immediate network fetch
          setLoading(false);
        } else {
          setLoading(true);
          loadConversations();
        }
      } else {
        loadConversations();
      }
    } catch {
      loadConversations();
    }
    // Background silent refresh every 30s to keep unread counts fresh
    if (pollingTimer.current) {
      try {
        window.clearInterval(pollingTimer.current);
      } catch {}
      pollingTimer.current = null;
    }
    pollingTimer.current = window.setInterval(() => {
      loadConversations(true);
    }, 30000) as any;
    return () => {
      if (pollingTimer.current) {
        try {
          window.clearInterval(pollingTimer.current);
        } catch {}
        pollingTimer.current = null;
      }
    };
  }, [token]);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Live updates: bump conversations on incoming messages
  useEffect(() => {
    function onReceiveMessage(msg: any) {
      try {
        const convId = msg?.conversationId || msg?.conversation?._id;
        if (!convId) return;
        setConversations((prev) => {
          const idx = prev.findIndex((c: any) => String(c._id) === String(convId));
          if (idx === -1) return prev;
          const c = prev[idx];
          const isMine = String(msg?.sender?._id || msg?.senderId) === String(currentUserId);
          const updated: any = {
            ...c,
            lastMessage:
              msg?.message || msg?.text
                ? {
                    text: msg.message || msg.text,
                    createdAt: msg.createdAt || Date.now(),
                    sender: msg.sender,
                  }
                : c.lastMessage,
            updatedAt: msg?.createdAt || Date.now(),
            unreadCount: isMine ? c.unreadCount || 0 : (c.unreadCount || 0) + 1,
          };
          const next = [...prev];
          next[idx] = updated;
          return sortConversations(next);
        });
      } catch {}
    }

    function onMessageEdited(payload: any) {
      try {
        const convId = payload?.conversationId || payload?.conversation?._id;
        if (!convId) return;
        setConversations((prev) => {
          const idx = prev.findIndex((c: any) => String(c._id) === String(convId));
          if (idx === -1) return prev;
          const c = prev[idx];
          const isLast = String(c.lastMessage?._id) === String(payload?._id);
          const updated = {
            ...c,
            lastMessage: isLast
              ? { ...c.lastMessage, text: payload?.text || payload?.message }
              : c.lastMessage,
          };
          const next = [...prev];
          next[idx] = updated;
          return next;
        });
      } catch {}
    }
    try {
      socket?.on('receive_message', onReceiveMessage);
      socket?.on('message_edited', onMessageEdited);
    } catch {}
    return () => {
      try {
        socket?.off('receive_message', onReceiveMessage);
        socket?.off('message_edited', onMessageEdited);
      } catch {}
    };
  }, [currentUserId]);

  function loadConversations(silent: boolean = false) {
    if (!silent) setLoading(true);
    axios
      .get(API + '/api/conversations', {
        headers: { Authorization: 'Bearer ' + token },
      })
      .then((r) => {
        const convs = Array.isArray(r.data) ? r.data : r.data || [];
        const sorted = sortConversations(convs);
        updateConversations(sorted);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: sorted }));
        } catch {}
      })
      .catch((err) => {
        try {
          const status = err?.response?.status;
          const data = err?.response?.data;
          const url = (err?.config?.baseURL || '') + (err?.config?.url || '');
          console.error('ConversationsList error', { url, status, data });
        } catch {
          console.error('ConversationsList error', err);
        }
        // keep any cached list rather than clearing to empty
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }

  function sortConversations(list: any[]) {
    return [...list].sort((a, b) => {
      const aUnread = a.unreadCount || 0;
      const bUnread = b.unreadCount || 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      const aTime = new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime();
      const bTime = new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime();
      return bTime - aTime;
    });
  }

  function avatarUrl(u: any) {
    if (!u?.avatar) return PLACEHOLDER;
    if (u.avatar.startsWith('http')) return u.avatar;
    if (u.avatar.startsWith('/')) return API + u.avatar;
    return API + '/uploads/' + u.avatar;
  }

  async function handleDeleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this conversation? (Only for you)')) return;

    try {
      await axios.delete(`${API}/api/conversations/${convId}`, {
        headers: { Authorization: 'Bearer ' + token },
      });

      // Reload conversations from server (will filter out if empty)
      loadConversations();
    } catch (err) {
      console.error('Delete conversation error:', err);
      alert('Failed to delete conversation');
    }
  }

  async function handleClearMessages(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Clear all messages in this chat? (Only for you)')) return;

    try {
      await axios.delete(`${API}/api/conversations/${convId}/messages`, {
        headers: { Authorization: 'Bearer ' + token },
      });

      // Reload conversations from server (will filter out if empty)
      loadConversations();
    } catch (err) {
      console.error('Clear messages error:', err);
      alert('Failed to clear messages');
    }
  }

  const filtered = React.useMemo(() => {
    const q = debouncedQuery;
    if (!q) return conversations;
    return conversations.filter((c: any) => {
      const partner = (c.participants || []).find(
        (p: any) => String(p._id) !== String(currentUserId),
      );
      const u = partner || {};
      return (
        String(u.username || '')
          .toLowerCase()
          .includes(q) ||
        String(u.status || '')
          .toLowerCase()
          .includes(q)
      );
    });
  }, [conversations, debouncedQuery, currentUserId]);

  const visible = React.useMemo(() => {
    if (showAll) return filtered;
    return filtered.slice(0, 50);
  }, [filtered, showAll]);

  function startPress(id: string) {
    try {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
      pressTimer.current = window.setTimeout(() => {
        setLongPressFor(id);
        try {
          localStorage.setItem('auralink-hint-conversations-longpress', 'true');
          setShowLongPressHint(false);
        } catch {}
      }, 500) as any;
    } catch {}
  }

  function cancelPress() {
    try {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    } catch {}
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      {showDebugBanner && (
        <div
          className="rounded-lg px-3 py-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div>
                <span className="font-semibold">Debug:</span> API_URL = {debugInfo.api || 'unset'}
              </div>
              <div>
                Token = {debugInfo.token}; UserId = {debugInfo.userId}
              </div>
            </div>
            <button
              className="text-[11px] px-2 py-1 rounded-md bg-white/60 dark:bg-slate-700/60 hover:opacity-80"
              onClick={() => {
                try {
                  localStorage.setItem('dm-debug-banner-dismissed', 'true');
                } catch {}
                setShowDebugBanner(false);
              }}
            >
              Hide
            </button>
          </div>
        </div>
      )}
      {showLongPressHint && (
        <div
          className="rounded-lg px-3 py-2 text-xs bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-theme-secondary">
              Tip: Press and hold a conversation for actions.
            </span>
            <button
              className="text-[11px] px-2 py-1 rounded-md bg-white/60 dark:bg-slate-700/60 hover:opacity-80"
              onClick={() => {
                try {
                  localStorage.setItem('auralink-hint-conversations-longpress', 'true');
                } catch {}
                setShowLongPressHint(false);
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
      {/* Total Unread Badge - only show if there are actual conversations with unread messages */}
      {!loading && conversations.length > 0 && totalUnread > 0 && (
        <div className="sticky top-0 z-10 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white px-4 py-2 rounded-xl text-center font-semibold shadow-lg ring-1 ring-white/20">
          {totalUnread} unread message{totalUnread !== 1 ? 's' : ''}
        </div>
      )}

      {/* Search + Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <input
          className="input w-full sm:w-64"
          placeholder="Search conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <button
            className="text-xs px-3 py-1.5 rounded-md border"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => loadConversations()}
            title="Refresh"
          >
            Refresh
          </button>
          {filtered.length > 50 && (
            <button
              className="text-xs px-3 py-1.5 rounded-md border"
              style={{ borderColor: 'var(--border)' }}
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? 'Show first 50' : `Show all (${filtered.length})`}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border animate-pulse"
              style={{ borderColor: 'var(--border)' }}
            >
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
      ) : conversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 dark:bg-slate-800/60 border border-white/20 text-cyan-400 shadow-sm mb-3">
            <MessageSquare className="w-9 h-9" />
          </div>
          <div className="text-heading font-semibold">No conversations yet</div>
          <div className="text-xs text-theme-secondary mt-2">Start chatting with users from the All Users page</div>
        </div>
      ) : (
        visible.map((c: any) => {
          const partner = (c.participants || []).find(
            (p: any) => String(p._id) !== String(currentUserId),
          );

          if (!partner) return null;

          const unreadCount = c.unreadCount || 0;

          return (
            <div
              key={c._id}
              className={`
                flex flex-col sm:flex-row sm:items-center sm:justify-between 
                p-3 sm:p-4 rounded-xl 
                bg-white dark:bg-slate-800
                border transition-all
                ${
                  unreadCount > 0
                    ? 'border-emerald-400 dark:border-emerald-500 shadow-md shadow-emerald-100 dark:shadow-emerald-900/30'
                    : 'border-gray-200 dark:border-gray-700 hover:shadow-lg hover:ring-1 hover:ring-cyan-400/30'
                }
                gap-3 relative
              `}
              onMouseDown={() => startPress(c._id)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={() => startPress(c._id)}
              onTouchEnd={cancelPress}
            >
              {/* Unread Badge */}
              {unreadCount > 0 && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-emerald-500 to-indigo-600 text-white text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </div>
              )}

              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="relative flex-shrink-0">
                  <Avatar
                    src={avatarUrl(partner)}
                    onClick={() => onShowProfile(partner)}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover cursor-pointer hover:scale-105 transition-transform"
                    alt={partner.username}
                    loading="lazy"
                  />
                  {/* Online status indicator */}
                  {onlineUsers?.has(partner._id) && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-slate-800 rounded-full shadow-sm"></div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className={`font-bold truncate ${unreadCount > 0 ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-900 dark:text-slate-100'} cursor-pointer`}
                    onClick={() => {
                      // Optimistically zero unread and open chat when clicking name
                      setConversations((prev) => {
                        const idx = prev.findIndex((x: any) => String(x._id) === String(c._id));
                        if (idx === -1) return prev;
                        const next = [...prev];
                        next[idx] = { ...next[idx], unreadCount: 0 };
                        setTotalUnread(
                          next.reduce((sum: number, x: any) => sum + (x.unreadCount || 0), 0),
                        );
                        try {
                          localStorage.setItem(
                            CACHE_KEY,
                            JSON.stringify({ ts: Date.now(), data: next }),
                          );
                        } catch {}
                        return next;
                      });
                      onOpenConversation(c);
                    }}
                    title="Open chat"
                  >
                    {partner.username}
                  </div>
                  {/* Last message preview + relative time */}
                  <div className="text-xs mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                    {c.lastMessage?.text ? c.lastMessage.text : c.lastMessage ? '(attachment)' : ''}
                    {c.lastMessage?.createdAt && (
                      <span className="ml-2 text-[10px] text-slate-400">
                        • {dayjs(c.lastMessage.createdAt).fromNow()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  className="text-xs px-3 py-1.5 rounded-md border"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowProfile(partner);
                  }}
                  title="View Profile"
                >
                  View Profile
                </button>
                {/* Long-press action sheet */}
                {longPressFor === c._id && (
                  <div
                    className="absolute right-3 top-3 z-20 rounded-lg shadow-xl border bg-white dark:bg-slate-800"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        handleClearMessages(c._id, e);
                        setLongPressFor(null);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <MessageSquareOff className="w-4 h-4" />
                      Clear Messages
                    </button>
                    <button
                      onClick={(e) => {
                        handleDeleteConversation(c._id, e);
                        setLongPressFor(null);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Conversation
                    </button>
                    <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLongPressFor(null);
                      }}
                      className="w-full px-4 py-2 text-xs text-theme-secondary hover:opacity-80 text-left"
                    >
                      Close
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
