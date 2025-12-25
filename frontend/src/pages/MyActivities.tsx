import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
// Venue functionality moved to MyVenues page
import CreateEventModal from '../components/CreateEventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EventDetailModal from '../components/EventDetailModal';
import MyServices from './MyServices';
import MyProducts from './MyProducts';
import MyVenues from './MyVenues';
import { Calendar, MapPin, Users, Trophy } from 'lucide-react';

export default function MyActivities({ token, onOpenConversation, onNavigate, onToast }: { token: string | null, onOpenConversation?: (conv: any) => void, onNavigate?: (view: string) => void, onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
  const sportStyle = (raw?: string) => {
    const s = (raw || '').toLowerCase();
    const map: Record<string, { badge: string; gradient: string }> = {
      basketball: {
        badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        gradient: 'from-orange-500/30 to-amber-500/30',
      },
      rugby: {
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        gradient: 'from-emerald-500/30 to-teal-500/30',
      },
      chess: {
        badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
        gradient: 'from-indigo-500/30 to-purple-500/30',
      },
      football: {
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        gradient: 'from-green-500/30 to-lime-500/30',
      },
      soccer: {
        badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        gradient: 'from-green-500/30 to-lime-500/30',
      },
      tennis: {
        badge: 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
        gradient: 'from-lime-500/30 to-emerald-500/30',
      },
    };
    return map[s] || { badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', gradient: 'from-indigo-500/30 to-cyan-500/30' };
  };

  const venueStatusStyle = (raw?: string) => {
    const s = (raw || '').toLowerCase();
    if (s.includes('avail')) return 'badge-accent';
    if (s.includes('closed')) return 'badge-violet';
    if (s.includes('maint')) return 'badge-amber';
    if (s.includes('book')) return 'badge-amber';
    return '';
  };

  const btn = (variant: 'primary' | 'success' | 'danger' | 'outline' | 'warning' | 'ghost', size: 'sm' | 'md' = 'md') => {
    const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed';
    const sizing = size === 'sm' ? 'px-2.5 py-1.5 text-sm' : 'px-3 py-2 text-sm';
    const variants: Record<string, string> = {
      primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-400',
      success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-400',
      danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-400',
      outline: 'border border-gray-300 text-gray-800 dark:text-gray-100 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-gray-300',
      warning: 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-400',
      ghost: 'border border-transparent text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-gray-300',
    };
    return `${base} ${sizing} ${variants[variant]}`;
  };
  // Venues moved to MyVenues page
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [generatedTokens, setGeneratedTokens] = useState<any[]>([]);
  const [receivedTokens, setReceivedTokens] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  // const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [initialEventToken, setInitialEventToken] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  // const [editingVenue, setEditingVenue] = useState<any | null>(null);
  const [confirmLeaveEventId, setConfirmLeaveEventId] = useState<string | null>(null);
  const [createdEvents, setCreatedEvents] = useState<any[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [includeArchived, setIncludeArchived] = useState<boolean>(true);
  const [servicesCount, setServicesCount] = useState<number>(0);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  // const [confirmDeleteVenueId, setConfirmDeleteVenueId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'services' | 'products' | 'venues'>('events');
  const [eventsQuery, setEventsQuery] = useState<string>('');
  const [venuesCount, setVenuesCount] = useState<number>(0);
  const [eventsSubTab, setEventsSubTab] = useState<'created' | 'joined' | 'past'>(() => {
    const saved = localStorage.getItem('myactivities.events.tab');
    return (saved === 'joined' || saved === 'past') ? (saved as any) : 'created';
  });

  async function refreshAll() {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const meRes = await axios.get(`${API_URL}/users/me`, { headers });
      setMe(meRes.data || null);
      const [s, r, g, t, ce, je, ae] = await Promise.all([
        axios.get(`${API_URL}/booking-requests/my/sent`, { headers }),
        axios.get(`${API_URL}/booking-requests/my/received`, { headers }),
        axios.get(`${API_URL}/tokens/my/generated`, { headers }),
        axios.get(`${API_URL}/tokens/my/received`, { headers }),
        axios.get(`${API_URL}/events/my/created?includeArchived=${includeArchived}`, { headers }),
        // Always fetch joined events as active-only (exclude archived)
        axios.get(`${API_URL}/events/my/joined?includeArchived=false`, { headers }),
        includeArchived ? axios.get(`${API_URL}/events/my/archived`, { headers }) : Promise.resolve({ data: { events: [] } }),
      ]);
      setSentRequests(s.data.requests || []);
      setReceivedRequests(r.data.requests || []);
      setGeneratedTokens(g.data.tokens || []);
      setReceivedTokens(t.data.tokens || []);
      setCreatedEvents(ce.data.events || []);
      setJoinedEvents(je.data.events || []);
      setArchivedEvents(ae.data.events || []);

      // Fetch counts for services and products
      try {
        const servicesRes = await axios.get(`${API_URL}/services/my/created`, { headers });
        setServicesCount((servicesRes.data?.services || []).length);
      } catch {}
      try {
        const userId = meRes.data?._id;
        if (userId) {
          const prodRes = await axios.get(`${API_URL}/marketplace/user/${userId}`, { headers });
          setProductsCount((prodRes.data || []).length);
        }
      } catch {}
    } catch (e) {
      // swallow errors in dashboard
    }
  }

  useEffect(() => { refreshAll(); }, [token, includeArchived]);
  useEffect(() => { localStorage.setItem('myactivities.events.tab', eventsSubTab); }, [eventsSubTab]);
  useEffect(() => { setIncludeArchived(eventsSubTab === 'past'); }, [eventsSubTab]);


  async function startConversationWithUser(userId: string) {
    if (!token || !onOpenConversation) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await axios.post(`${API_URL.replace(/\/api$/, '')}/api/users/conversations/start`, { partnerId: userId }, { headers });
      if (res.data) onOpenConversation(res.data);
    } catch (e: any) {
      console.error('Start conversation error', e);
      alert(e.response?.data?.error || 'Could not start conversation');
    }
  }


  async function joinEvent(eventId: string) {
    if (!token) return;
    setBusy(eventId);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(`${API_URL}/events/${eventId}/join`, {}, { headers });
      const je = await axios.get(`${API_URL}/events/my/joined?includeArchived=false`, { headers });
      setJoinedEvents(je.data.events || []);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to join event');
    } finally {
      setBusy(null);
    }
  }

  async function leaveEvent(eventId: string) {
    if (!token) return;
    setBusy(eventId);
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(`${API_URL}/events/${eventId}/leave`, {}, { headers });
      const je = await axios.get(`${API_URL}/events/my/joined?includeArchived=false`, { headers });
      setJoinedEvents(je.data.events || []);
      onToast && onToast('Left event.', 'success');
    } catch (e: any) {
      onToast && onToast(e.response?.data?.error || 'Failed to leave event', 'error');
    } finally {
      setBusy(null);
    }
  }

  // Booking system moved to MyVenues

  return (
    <>
    <div className="min-h-screen themed-page">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Activities</h2>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:justify-end w-full sm:w-auto">
            <button
              className={`${btn('success')} w-full sm:w-auto`}
              onClick={() => { setInitialEventToken(''); setShowCreateEvent(true); }}
            >
              + Create Event
            {activeTab === 'events' && (
              <div className="flex flex-wrap gap-2 mt-3" role="tablist" aria-label="Events Subtabs">
                <button
                  className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${eventsSubTab === 'created' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
                  onClick={() => setEventsSubTab('created')}
                  role="tab"
                  aria-selected={eventsSubTab === 'created'}
                >
                  Created ({createdEvents.length})
                </button>
                <button
                  className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${eventsSubTab === 'joined' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
                  onClick={() => setEventsSubTab('joined')}
                  role="tab"
                  aria-selected={eventsSubTab === 'joined'}
                >
                  Joined ({joinedEvents.length})
                </button>
                <button
                  className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${eventsSubTab === 'past' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
                  onClick={() => setEventsSubTab('past')}
                  role="tab"
                  aria-selected={eventsSubTab === 'past'}
                >
                  Past ({archivedEvents.length})
                </button>
              </div>
            )}

            {activeTab === 'events' && eventsSubTab === 'created' && (
          </div>
        </div>

          role="tab"
        >
          My Events ({createdEvents.length})
        </button>
        <button
          className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'venues' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('venues')}
          role="tab"
          aria-selected={activeTab === 'venues'}
        >
          My Venues {venuesCount ? `(${venuesCount})` : ''}
        </button>
        <button
          className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'services' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('services')}
          role="tab"
          aria-selected={activeTab === 'services'}
        >
          My Services ({servicesCount})
        </button>
        <button
          className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'products' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('products')}
          role="tab"
          aria-selected={activeTab === 'products'}
        >
          My Products ({productsCount})
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
        <button className={`${btn('outline')} w-full sm:w-auto`} onClick={refreshAll}>Refresh</button>
        {activeTab === 'events' && (
          <input
            value={eventsQuery}
            onChange={(e) => setEventsQuery(e.target.value)}
            placeholder="Search events, venues, requests, tokens"
            className="input w-full sm:w-80 sm:ml-auto"
            aria-label="Search events"
          />
        )}
      </div>

      {/* helper to filter by query */}
      {/**/}

      {/* Venues moved to dedicated tab */}

      

      {activeTab === 'events' && eventsSubTab === 'joined' && (
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-semibold">Events I Joined <span className="text-sm font-normal text-gray-500">({joinedEvents.length})</span></h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {joinedEvents.filter((e) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (e.title || '').toLowerCase().includes(q) ||
              (e.organizer?.username || '').toLowerCase().includes(q) ||
              (e.location?.city || e.location?.name || '').toLowerCase().includes(q)
            );
          }).map((e) => (
            <div key={e._id} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all hover:ring-2 hover:ring-[var(--accent-cyan)]/40">
              <div className={`h-1 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3 opacity-80 group-hover:opacity-100`} />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="text-lg font-semibold text-heading line-clamp-2">{e.title}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-theme-secondary">
                    <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
                    <span>{e.location?.city || e.location?.name || 'Location TBA'}</span>
                  </div>
                </div>
                <span className="badge">Organized by {e.organizer?.username}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-theme-secondary">
                <Calendar className="w-4 h-4 text-[var(--accent-violet)]" />
                <span>Starts: {new Date(e.startDate).toLocaleString()}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.organizer?._id && (
                  <button className="flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto whitespace-normal break-words text-left" onClick={() => startConversationWithUser(e.organizer._id)}>
                    Message Organizer
                  </button>
                )}
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto"
                  onClick={() => setSelectedEvent(e)}
                >
                  View
                </button>
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-auto"
                  disabled={busy === e._id}
                  onClick={() => setConfirmLeaveEventId(e._id)}
                >
                  {busy === e._id ? 'Leaving…' : 'Leave Event'}
                </button>
              </div>
            </div>
          ))}
          {joinedEvents.length === 0 && <p className="text-sm text-gray-500">No joined events yet.</p>}
        </div>
      </section>
      )}


      {activeTab === 'events' && eventsSubTab === 'past' && (
        <section>
          <h3 className="text-xl font-semibold mb-2">Past Events</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archivedEvents.filter((e) => {
              const q = eventsQuery.toLowerCase();
              if (!q) return true;
              return (
                (e.title || '').toLowerCase().includes(q) ||
                (e.location?.city || e.location?.name || '').toLowerCase().includes(q)
              );
            }).map((e) => (
              <div key={e._id} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all hover:ring-2 hover:ring-[var(--accent-cyan)]/40">
                <div className={`h-1 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3 opacity-70`} />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <div>
                    <div className="text-lg font-semibold text-heading line-clamp-2">{e.title}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-theme-secondary">
                      <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
                      <span>{e.location?.city || e.location?.name || 'Location TBA'}</span>
                    </div>
                  </div>
                  <span className="badge badge-amber">Ended</span>
                </div>
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-theme-secondary">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[var(--accent-violet)]" />
                    <span>Started: {new Date(e.startDate).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <Users className="w-4 h-4 text-[var(--accent-amber)]" />
                    <span>{e.participants?.length || 0} joined</span>
                  </div>
                </div>
                {e.organizer?._id && (
                  <div className="mt-3">
                    <button className="flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto whitespace-normal break-words text-left" onClick={() => startConversationWithUser(e.organizer._id)}>
                      Message Organizer
                    </button>
                    <button className="mt-2 sm:mt-0 sm:ml-2 inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => setSelectedEvent(e)}>
                      View
                    </button>
                  </div>
                )}
              </div>
            ))}
            {archivedEvents.length === 0 && <p className="text-sm text-gray-500">No past events.</p>}
          </div>
        </section>
      )}

      {activeTab === 'services' && (
        <div className="mt-4">
          <MyServices
            token={token}
            onNavigate={() => setActiveTab('events')}
            onToast={onToast}
            onUpdated={() => refreshAll()}
          />
        </div>
      )}
      {activeTab === 'products' && (
        <div className="mt-4">
          <MyProducts
            token={token}
            onNavigate={() => setActiveTab('events')}
            onToast={onToast}
            onUpdated={() => refreshAll()}
          />
        </div>
      )}
      {activeTab === 'venues' && (
        <div className="mt-4">
          <MyVenues
            token={token}
            onNavigate={() => setActiveTab('events')}
            onToast={onToast}
            onCountChange={(n) => setVenuesCount(n)}
            onUpdated={() => refreshAll()}
            onOpenConversation={onOpenConversation}
          />
        </div>
      )}

      </div>
    </div>
    <ConfirmDialog
      isOpen={!!confirmLeaveEventId}
      title="Leave Event"
      message="Are you sure you want to leave this event?"
      confirmLabel="Leave"
      cancelLabel="Stay"
      onConfirm={async () => {
        if (confirmLeaveEventId) await leaveEvent(confirmLeaveEventId);
        setConfirmLeaveEventId(null);
      }}
      onCancel={() => setConfirmLeaveEventId(null)}
    />
    <ConfirmDialog
      isOpen={!!confirmDeleteEventId}
      title="Delete Event"
      message="Delete this event? This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={async () => {
        if (!token || !confirmDeleteEventId) return;
        const headers = { Authorization: `Bearer ${token}` };
        await axios.delete(`${API_URL}/events/${confirmDeleteEventId}`, { headers });
        const ce = await axios.get(`${API_URL}/events/my/created?includeArchived=${includeArchived}`, { headers });
        setCreatedEvents(ce.data.events || []);
        onToast && onToast('Event deleted.', 'success');
        setConfirmDeleteEventId(null);
      }}
      onCancel={() => setConfirmDeleteEventId(null)}
    />
    {showCreateEvent && (
      <CreateEventModal
        isOpen={showCreateEvent}
        onClose={() => { setShowCreateEvent(false); setInitialEventToken(''); setEditingEvent(null); }}
        token={token}
        initialToken={initialEventToken}
        editingEvent={editingEvent}
        onSuccess={async () => {
          try {
            const headers = { Authorization: `Bearer ${token}` };
            const [ce, je] = await Promise.all([
              axios.get(`${API_URL}/events/my/created`, { headers }),
              axios.get(`${API_URL}/events/my/joined`, { headers }),
            ]);
            setCreatedEvents(ce.data.events || []);
            setJoinedEvents(je.data.events || []);
          } catch {}
          setShowCreateEvent(false);
          setInitialEventToken('');
          setEditingEvent(null);
          onToast && onToast(editingEvent ? 'Event updated.' : 'Event created.', 'success');
        }}
      />
    )}
    <EventDetailModal
      event={selectedEvent}
      onClose={() => setSelectedEvent(null)}
      onJoin={(id: string) => joinEvent(id)}
      onLeave={(id: string) => setConfirmLeaveEventId(id)}
      onMessage={(organizerId: string) => startConversationWithUser(organizerId)}
      currentUserId={me?._id}
    />
    </>
  );
}
