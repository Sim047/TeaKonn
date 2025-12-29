// All Events - Organized view of all user events
import { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader,
  Star,
  Trophy,
  DollarSign,
  Search,
} from 'lucide-react';
import SearchBar from '../components/SearchBar';

dayjs.extend(relativeTime);

import { API_URL } from '../config/api';
const API = API_URL.replace(/\/api$/, '');

function toOtherItem(p: any, role: 'organizing' | 'participating') {
  return {
    _id: p._id,
    title: p.title || p.caption || 'Post',
    startDate: p.createdAt,
    time: null,
    location: p.location || '',
    participants: p.participants || [],
    organizer: p.author
      ? { _id: p.author._id || p.author, username: p.author.username, avatar: p.author.avatar }
      : undefined,
    role,
    isOther: true,
    source: 'post',
  };
}

export default function AllEvents({ token, onBack, onNavigate, onViewEvent }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showPastOnly, setShowPastOnly] = useState<boolean>(() => {
    try {
      return localStorage.getItem('auralink-all-events-filter') === 'past';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      setLoading(true);
      setError('');

      // Load all events (created + participating) and other events (posts tagged as events)
      const [createdRes, participatingRes, postsRes] = await Promise.all([
        axios.get(`${API}/api/events/my/created`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/api/events?status=published`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/api/posts`, {
          params: { limit: 200 },
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const created = (createdRes.data.events || []).map((e: any) => ({
        ...e,
        role: 'organizing',
        isOther: false,
        source: 'event',
      }));
      const all = participatingRes.data.events || [];
      const postsAll = (postsRes.data?.posts || postsRes.data || []).filter((p: any) => {
        const tags = Array.isArray(p.tags) ? p.tags : p.tags ? [p.tags] : [];
        return tags.some((t: any) =>
          String(t || '')
            .toLowerCase()
            .includes('event'),
        );
      });

      // Get user ID from token with localStorage fallback
      let userId: string | undefined = undefined;
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.id || payload._id;
        } catch {
          try {
            const raw = localStorage.getItem('user');
            if (raw) {
              const u = JSON.parse(raw);
              userId = u?._id || u?.id;
            }
          } catch {}
        }
      } else {
        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            userId = u?._id || u?.id;
          }
        } catch {}
      }

      const participating = all
        .filter((e: any) => e.participants?.some((p: any) => p._id === userId || p === userId))
        .map((e: any) => ({ ...e, role: 'participating', isOther: false, source: 'event' }));

      // Other Events (posts): authored and participating
      const authoredOther = postsAll
        .filter((p: any) => String(p.author?._id || p.author) === String(userId))
        .map((p: any) => toOtherItem(p, 'organizing'));
      const participatingOther = postsAll
        .filter((p: any) =>
          (p.participants || []).some((u: any) => String(u?._id || u) === String(userId)),
        )
        .map((p: any) => toOtherItem(p, 'participating'));

      // Combine and deduplicate across sources
      const combined = [...created, ...participating, ...authoredOther, ...participatingOther];
      const seen = new Set<string>();
      const deduped = combined.filter((item: any) => {
        const key = `${item.source}:${item._id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      setEvents(deduped);
    } catch (err: any) {
      console.error('Load events error:', err);
      setError(err.response?.data?.error || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }

  const displayEvents = events
    .filter((e) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const loc = e.location?.city || e.location?.name || e.location?.state || '';
      return (
        String(e.title || '')
          .toLowerCase()
          .includes(q) ||
        String(e.sport || '')
          .toLowerCase()
          .includes(q) ||
        String(loc).toLowerCase().includes(q)
      );
    })
    .filter((e) => {
      if (!showPastOnly) return true;
      // Past applies only to real events (not Other Events/posts)
      const isArchived = !!(e as any).archivedAt;
      const isPastDate = !isArchived && !e.isOther && new Date(e.startDate) < new Date();
      return !e.isOther && (isArchived || isPastDate);
    });

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-theme-secondary hover:text-heading mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-heading mb-2">All Events</h1>
              <p className="text-theme-secondary">Manage all your events in one place</p>
            </div>
            {showPastOnly && (
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                  Showing: Past
                </span>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('auralink-all-events-filter', 'all');
                    } catch {}
                    setShowPastOnly(false);
                  }}
                  className="text-sm px-3 py-1 rounded-lg border"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                >
                  Show All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-xl">
          <SearchBar
            value={search}
            onChange={(v) => setSearch(v)}
            placeholder="Search by title, sport, or location"
          />
        </div>
        {/* Unified list — filters removed; shows all events including Other Events */}

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : displayEvents.length === 0 ? (
          <div className="rounded-2xl p-12 text-center themed-card">
            <Calendar className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">
              {showPastOnly ? 'No past events' : 'No events'}
            </h3>
            <p className="text-theme-secondary">
              {showPastOnly
                ? 'You have no past events yet'
                : 'Try adjusting your search or check back later'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayEvents.map((event) => {
              const isPast = !event.isOther && new Date(event.startDate) < new Date();

              return (
                <div
                  key={event._id}
                  onClick={() => {
                    if (event.isOther) {
                      try {
                        localStorage.setItem('auralink-highlight-post', event._id);
                      } catch {}
                      localStorage.setItem('auralink-discover-category', 'other');
                      onNavigate && onNavigate('discover');
                    } else {
                      onViewEvent && onViewEvent(event._id);
                    }
                  }}
                  className="rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden themed-card"
                >
                  {/* Role Badge */}
                  <div className="absolute top-4 right-4 z-10">
                    {event.role === 'organizing' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        Organizing
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Participating
                      </span>
                    )}
                  </div>

                  {/* Past Event Overlay */}
                  {isPast && (
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                        Past
                      </span>
                    </div>
                  )}

                  <div className={`space-y-4 ${isPast ? 'opacity-60' : ''}`}>
                    {/* Sport Badge */}
                    {event.sport && !event.isOther && (
                      <div className="flex items-center gap-2 mt-8">
                        <Trophy className="w-4 h-4 text-blue-500" />
                        <span className="text-sm font-medium text-theme-secondary">
                          {event.sport}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h3 className="text-xl font-bold text-heading group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {event.title}
                    </h3>

                    {/* Details */}
                    <div className="space-y-2 text-sm text-theme-secondary">
                      {event.isOther ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>Community event</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-blue-500" />
                          <span>{dayjs(event.startDate).format('MMM D, YYYY')}</span>
                          {event.time && <span>at {event.time}</span>}
                        </div>
                      )}

                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-red-500" />
                          <span>
                            {event.isOther
                              ? String(event.location || '')
                              : `${event.location.city || event.location.name}${event.location.state ? `, ${event.location.state}` : ''}`}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span>
                          {event.participants?.length || 0}
                          {!event.isOther && <> / {event.capacity?.max || 0} participants</>}
                        </span>
                      </div>

                      {!event.isOther && event.pricing && event.pricing.amount > 0 && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="font-semibold">
                            {event.pricing.currency} {event.pricing.amount}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Organizer */}
                    {event.organizer && (
                      <div className="pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                        <p className="text-xs text-theme-secondary">
                          By {event.organizer.username}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
