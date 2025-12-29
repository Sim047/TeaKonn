import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { ArrowLeft, Calendar, MapPin, Users, Search, Loader } from 'lucide-react';
import { API_URL } from '../config/api';

dayjs.extend(relativeTime);

const API = API_URL.replace(/\/api$/, '');

export default function PastEvents({ token, onBack, onNavigate }: { token?: string; onBack: () => void; onNavigate: (v: string) => void }) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPastEvents();
  }, []);

  async function loadPastEvents() {
    try {
      setLoading(true);
      setError('');
      // Fetch archived and past events for the current user
      let combined: any[] = [];
      if (token) {
        const [createdRes, joinedRes] = await Promise.all([
          axios.get(`${API}/api/events/my/created`, {
            params: { includeArchived: true },
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${API}/api/events/my/joined`, {
            params: { includeArchived: true },
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const created = createdRes.data.events || [];
        const joined = joinedRes.data.events || [];
        combined = [...created, ...joined];
      } else {
        // Fallback: show general past/archived events (not user-specific)
        const res = await axios.get(`${API}/api/events`, {
          params: { includeArchived: true },
        });
        combined = res.data.events || [];
      }

      const past = combined.filter((e: any) => {
        const archived = !!e.archivedAt;
        const pastDate = !archived && e.startDate && new Date(e.startDate) < new Date();
        return archived || pastDate;
      });

      // Deduplicate by _id
      const seen = new Set<string>();
      const deduped = past.filter((e: any) => {
        if (seen.has(e._id)) return false;
        seen.add(e._id);
        return true;
      });

      setEvents(deduped);
    } catch (err: any) {
      console.error('Load past events error:', err);
      setError(err.response?.data?.error || 'Failed to load past events');
    } finally {
      setLoading(false);
    }
  }

  const display = events.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const loc = e.location?.city || e.location?.name || e.location?.state || '';
    return (
      String(e.title || '').toLowerCase().includes(q) ||
      String(e.sport || '').toLowerCase().includes(q) ||
      String(loc).toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-theme-secondary hover:text-heading mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-heading">Past Events</h1>
          <p className="text-theme-secondary">View events that have ended</p>
        </div>

        <div className="mb-6 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, sport, or location"
              className="w-full pr-4 py-2 rounded-lg input has-leading-icon"
              maxLength={100}
              inputMode="search"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">{error}</div>
        ) : display.length === 0 ? (
          <div className="rounded-2xl p-12 text-center themed-card">
            <Calendar className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">No past events</h3>
            <p className="text-theme-secondary">You have no past events yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {display.map((event) => (
              <div
                key={event._id}
                onClick={() => {
                  try {
                    localStorage.setItem('auralink-highlight-event', event._id);
                    localStorage.setItem('auralink-discover-category', 'sports');
                  } catch {}
                  onNavigate('discover');
                }}
                className="rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer themed-card"
              >
                <h3 className="text-xl font-bold text-heading mb-2">{event.title}</h3>
                <div className="space-y-2 text-sm text-theme-secondary">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{event.startDate ? dayjs(event.startDate).format('MMM D, YYYY') : 'Date unknown'}</span>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>
                        {event.location?.city || event.location?.name || event.location?.state || ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{event.participants?.length || 0} participants</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
