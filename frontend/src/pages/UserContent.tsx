import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import SearchBar from '../components/SearchBar';

const API = API_URL.replace(/\/api$/, '');

type Tab = 'events' | 'posts';

export default function UserContent({ token, onNavigate }: any) {
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(
    () => (localStorage.getItem('auralink-user-content-tab') as Tab) || 'events',
  );
  const [user, setUser] = useState<any>(null);

  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [totalPages, setTotalPages] = useState<number | null>(null);
  const [search, setSearch] = useState<string>('');
  const [eventFilter, setEventFilter] = useState<string>('All'); // All | Other | specific sport
  const SPORTS = ['Football/Soccer', 'Basketball', 'Tennis', 'Swimming', 'Athletics/Track & Field'];
  // Event filter removed for simplicity
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Prefetch cache for next page
  const [prefetch, setPrefetch] = useState<any[] | null>(null);
  const [prefetchPageNum, setPrefetchPageNum] = useState<number | null>(null);
  const [expandedCaption, setExpandedCaption] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUserId(localStorage.getItem('auralink-user-content-id'));
  }, []);

  useEffect(() => {
    if (!userId || !token) return;
    axios
      .get(`${API}/api/users/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setUser(r.data))
      .catch(() => setUser(null));
  }, [userId, token]);

  useEffect(() => {
    setItems([]);
    setPage(1);
    setHasMore(true);
  }, [tab, userId]);

  // Removed the direct load-on-page-change effect to avoid double fetches.

  // Auto-switch to Posts when selecting 'Other' under Events
  useEffect(() => {
    if (tab === 'events' && eventFilter === 'Other') {
      setTab('posts');
      try {
        localStorage.setItem('auralink-user-content-tab', 'posts');
      } catch {}
    }
  }, [eventFilter, tab]);

  const buildUrl = useCallback(
    (p: number) => {
      const limit = 20;
      const isEvents = tab === 'events';
      const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
      const isSportsSelection = isEvents && SPORTS.includes(eventFilter);
      const isOtherSelection = isEvents && eventFilter === 'Other';
      const sportParam = isSportsSelection ? `&sport=${encodeURIComponent(eventFilter)}` : '';
      const categoryParam = isOtherSelection
        ? `&category=other`
        : isSportsSelection
          ? `&category=sports`
          : '';
      const fieldsParam = isEvents
        ? `&fields=title,startDate,location,image`
        : `&fields=title,caption,imageUrl`;
      return tab === 'events'
        ? `${API}/api/events/user/${userId}?page=${p}&limit=${limit}${sportParam}${categoryParam}${searchParam}${fieldsParam}`
        : `${API}/api/posts/user/${userId}?page=${p}&limit=${limit}${searchParam}${fieldsParam}`;
    },
    [API, tab, userId, search, eventFilter],
  );

  const prefetchPage = useCallback(
    (pNext: number) => {
      if (!userId) return;
      const headers = { Authorization: `Bearer ${token}` };
      const url = buildUrl(pNext);
      axios
        .get(url, { headers })
        .then((r) => {
          const list = tab === 'events' ? r.data.events || [] : r.data.posts || [];
          setPrefetch(list);
          setPrefetchPageNum(pNext);
        })
        .catch(() => {
          /* ignore prefetch errors */
        })
        .finally(() => {});
    },
    [userId, token, buildUrl, tab],
  );

  function loadPage(p: number) {
    setLoading(true);
    const headers = { Authorization: `Bearer ${token}` };
    const url = buildUrl(p);
    axios
      .get(url, { headers })
      .then((r) => {
        const list = tab === 'events' ? r.data.events || [] : r.data.posts || [];
        // Dedupe by _id to avoid accidental double appends
        setItems((prev) => {
          const merged = [...prev, ...list];
          const seen = new Set<string>();
          const unique = merged.filter((it: any) => {
            const id = String(it?._id || '');
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          return unique;
        });
        const totalCount = (tab === 'events' ? r.data.total : r.data.totalPosts) || list.length;
        setTotal(totalCount);
        const tp = r.data.totalPages || 1;
        setTotalPages(tp);
        setHasMore(p < tp);
        // Background prefetch next page
        if (p < tp) prefetchPage(p + 1);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!sentinelRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          // If we already prefetched this upcoming page, consume it immediately
          setPage((pp) => pp + 1);
        }
      },
      { rootMargin: '800px' },
    );
    io.observe(sentinelRef.current);
    return () => io.disconnect();
  }, [hasMore, loading]);

  // When page changes, consume prefetch if available for this page
  useEffect(() => {
    if (tab === 'events' && eventFilter === 'Other') return;
    if (!userId || loading) return;
    if (prefetch && prefetchPageNum === page) {
      setItems((prev) => [...prev, ...prefetch]);
      setPrefetch(null);
      setPrefetchPageNum(null);
      if (totalPages) setHasMore(page < totalPages);
      // Preload next page again if more pages remain
      if (totalPages && page < totalPages) prefetchPage(page + 1);
      return;
    }
    if (hasMore) loadPage(page);
  }, [page, userId, tab]);

  function formatLocation(loc: any): string {
    try {
      if (!loc) return '';
      if (typeof loc === 'string') return loc;
      const parts = [loc.name, loc.city, loc.state, loc.country].filter(Boolean);
      return parts.join(', ');
    } catch {
      return '';
    }
  }

  function openFromCard(item: any) {
    if (tab === 'events') {
      try {
        localStorage.setItem('auralink-highlight-event', item._id);
        localStorage.setItem('auralink-discover-category', 'sports');
      } catch {}
      onNavigate && onNavigate('discover');
    } else {
      try {
        localStorage.setItem('auralink-highlight-post', item._id);
      } catch {}
      onNavigate && onNavigate('posts');
    }
  }

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-heading">{user?.username || 'User'}</h1>
            <p className="text-theme-secondary text-sm">
              {user?.status || (user?.username ? `@${user.username}` : '')}
            </p>
          </div>
          <button
            className="text-sm px-3 py-2 rounded-xl border"
            style={{ borderColor: 'var(--border)' }}
            onClick={() => onNavigate && onNavigate('dashboard')}
          >
            Back
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${tab === 'events' ? 'bg-cyan-600 text-white' : 'themed-card'}`}
            onClick={() => {
              setTab('events');
              localStorage.setItem('auralink-user-content-tab', 'events');
            }}
          >
            Events
          </button>
          <button
            className={`px-3 py-2 rounded-xl text-sm font-semibold ${tab === 'posts' ? 'bg-purple-600 text-white' : 'themed-card'}`}
            onClick={() => {
              setTab('posts');
              localStorage.setItem('auralink-user-content-tab', 'posts');
            }}
          >
            Posts
          </button>

          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <SearchBar
              value={search}
              onChange={(v) => setSearch(v)}
              onEnter={() => {
                setItems([]);
                setPage(1);
                setHasMore(true);
              }}
              placeholder={
                tab === 'events'
                  ? 'Search events (title, sport, location)…'
                  : 'Search posts (title, caption, tags)…'
              }
            />
          </div>
          {/* Event filter removed */}
        </div>

        <div className="space-y-3">
          {useMemo(
            () =>
              items.map((it) => (
                <div
                  key={it._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openFromCard(it)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openFromCard(it);
                  }}
                  className="w-full text-left p-3 rounded-xl themed-card hover:shadow-md"
                >
                  {tab === 'events' ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={it.image || 'https://placehold.co/80x80?text=E'}
                        loading="lazy"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-semibold text-heading line-clamp-1 break-words"
                          title={it.title || 'Untitled Event'}
                        >
                          {it.title || 'Untitled Event'}
                        </div>
                        <div className="text-xs text-theme-secondary truncate">
                          {formatLocation(it.location)}
                        </div>
                        <div className="text-xs text-cyan-500">
                          {it.startDate ? new Date(it.startDate).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <img
                        src={it.imageUrl || 'https://placehold.co/80x80?text=P'}
                        loading="lazy"
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className="text-sm font-semibold text-heading line-clamp-1 break-words"
                          title={it.title || 'Post'}
                        >
                          {it.title || 'Post'}
                        </div>
                        {(() => {
                          const cap = String(it.caption || '');
                          const expanded = !!expandedCaption[it._id];
                          const tooLong = cap.length > 160;
                          return (
                            <>
                              <div
                                className={`text-xs text-theme-secondary break-words overflow-hidden ${expanded ? '' : 'line-clamp-3'}`}
                                style={
                                  expanded
                                    ? undefined
                                    : ({
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        wordBreak: 'break-word',
                                      } as any)
                                }
                              >
                                {cap}
                              </div>
                              {tooLong && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setExpandedCaption((m) => ({ ...m, [it._id]: !expanded }));
                                  }}
                                  className="mt-1 text-[11px] font-semibold text-accent hover:underline"
                                >
                                  {expanded ? 'See less' : 'See more'}
                                </button>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              )),
            [items, tab],
          )}
          {loading && (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 rounded-xl themed-card animate-pulse" />
              ))}
            </div>
          )}
          <div className="flex items-center justify-between text-sm text-theme-secondary">
            <span>
              {total !== null ? `${items.length} / ${total} loaded` : `${items.length} loaded`}
            </span>
            {!hasMore && <span>End of results</span>}
          </div>
          <div ref={sentinelRef} className="py-4 text-center text-sm text-theme-secondary">
            {hasMore && !loading && (
              <button
                className="px-3 py-2 rounded-xl border"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => setPage((p) => p + 1)}
              >
                Load more
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
