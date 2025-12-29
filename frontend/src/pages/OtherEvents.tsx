// Other Events - Dedicated page fetching events with category=other
import { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Calendar, MapPin, ArrowLeft, Search, Users } from 'lucide-react';
import EventDetailModal from '../components/EventDetailModal';
import { API_URL } from '../config/api';

dayjs.extend(relativeTime);
const API = API_URL.replace(/\/api$/, '');

interface EventItem {
  _id: string;
  title: string;
  startDate?: string;
  time?: string;
  location?: any;
  participants?: any[];
  organizer?: { _id: string; username: string; avatar?: string };
  sport?: string;
  archivedAt?: string;
}

export default function OtherEvents({ token, onBack, onNavigate }: any) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    loadOtherEvents();
  }, []);

  async function loadOtherEvents() {
    try {
      setLoading(true);
      setError('');
      const res = await axios.get(`${API}/api/events`, {
        params: {
          category: 'other',
          status: 'published',
          fields:
            'title,startDate,time,location,capacity,organizer,participants,sport,imageCover,archivedAt',
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setEvents(res.data?.events || res.data || []);
    } catch (err: any) {
      console.error('Load other events error:', err);
      setError(err.response?.data?.error || 'Failed to load other events');
    } finally {
      setLoading(false);
    }
  }

  const filtered = events.filter((e) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const loc = e.location?.city || e.location?.name || e.location?.state || '';
    return (
      String(e.title || '').toLowerCase().includes(q) ||
      String(loc).toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack || (() => onNavigate && onNavigate('dashboard'))}
            className="flex items-center gap-2 text-sm text-theme-secondary hover:text-heading mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-heading mb-2">Other Events</h1>
              <p className="text-theme-secondary">Community activities beyond sports</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 max-w-xl">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or location"
              className="w-full pr-4 py-2 rounded-lg input has-leading-icon"
              maxLength={100}
              inputMode="search"
            />
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Calendar className="w-16 h-16 text-theme-secondary animate-pulse" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center themed-card">
            <Calendar className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">No events</h3>
            <p className="text-theme-secondary">Try adjusting your search or check back later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((event) => {
              const isPast = !!event.archivedAt || (event.startDate && new Date(event.startDate) < new Date());
              const loc = event.location?.city || event.location?.name || event.location?.state || '';
              return (
                <div
                  key={event._id}
                  onClick={() => setSelectedEvent(event)}
                  className="rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden themed-card"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-bold text-heading line-clamp-2">{event.title}</h3>
                    {isPast && (
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                        Past
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-theme-secondary">
                    {event.startDate && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {dayjs(event.startDate).format('MMM D, YYYY')}
                      </span>
                    )}
                    {loc && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {loc}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {(event.participants || []).length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {/* Event Detail Modal */}
      <EventDetailModal
        event={selectedEvent as any}
        onClose={() => setSelectedEvent(null)}
        onJoin={async (eventId: string) => {
          try {
            await axios.post(`${API}/api/events/${eventId}/join`, {}, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setSelectedEvent(refreshed.data);
          } catch (err) {
            console.error('Join error:', err);
          }
        }}
        onMessage={(organizerId: string) => {
          try {
            localStorage.setItem('auralink-open-chat-with', organizerId);
          } catch {}
          onNavigate && onNavigate('dashboard');
        }}
      />
    </div>
  );
}
