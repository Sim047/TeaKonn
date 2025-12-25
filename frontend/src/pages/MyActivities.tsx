import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateVenueModal from '../components/CreateVenueModal';
import CreateEventModal from '../components/CreateEventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EventDetailModal from '../components/EventDetailModal';
import MyServices from './MyServices';
import MyProducts from './MyProducts';
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
  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [generatedTokens, setGeneratedTokens] = useState<any[]>([]);
  const [receivedTokens, setReceivedTokens] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [initialEventToken, setInitialEventToken] = useState<string>('');
  const [editingEvent, setEditingEvent] = useState<any | null>(null);
  const [editingVenue, setEditingVenue] = useState<any | null>(null);
  const [confirmLeaveEventId, setConfirmLeaveEventId] = useState<string | null>(null);
  const [createdEvents, setCreatedEvents] = useState<any[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<any[]>([]);
  const [archivedEvents, setArchivedEvents] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmGenerateReq, setConfirmGenerateReq] = useState<any | null>(null);
  const [includeArchived, setIncludeArchived] = useState<boolean>(true);
  const [servicesCount, setServicesCount] = useState<number>(0);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [confirmDeleteVenueId, setConfirmDeleteVenueId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'services' | 'products'>('events');
  const [eventsQuery, setEventsQuery] = useState<string>('');

  async function refreshAll() {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const meRes = await axios.get(`${API_URL}/users/me`, { headers });
      setMe(meRes.data || null);
      const [v, s, r, g, t, ce, je, ae] = await Promise.all([
        axios.get(`${API_URL}/venues/my`, { headers }),
        axios.get(`${API_URL}/booking-requests/my/sent`, { headers }),
        axios.get(`${API_URL}/booking-requests/my/received`, { headers }),
        axios.get(`${API_URL}/tokens/my/generated`, { headers }),
        axios.get(`${API_URL}/tokens/my/received`, { headers }),
        axios.get(`${API_URL}/events/my/created?includeArchived=${includeArchived}`, { headers }),
        // Always fetch joined events as active-only (exclude archived)
        axios.get(`${API_URL}/events/my/joined?includeArchived=false`, { headers }),
        includeArchived ? axios.get(`${API_URL}/events/my/archived`, { headers }) : Promise.resolve({ data: { events: [] } }),
      ]);
      setMyVenues(v.data.venues || []);
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

  async function generateTokenForRequest(reqItem: any) {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      // Initiate payment (stub)
      const idempotencyKey = `br_${reqItem._id}`;
      await axios.post(`${API_URL}/payments/initiate`, { bookingRequestId: reqItem._id, amount: 1000, currency: 'KES', idempotencyKey }, { headers });
      // Simulate callback success
      await axios.post(`${API_URL}/payments/callback`, { status: 'success', idempotencyKey });
      // Generate token
      await axios.post(`${API_URL}/tokens/generate`, { bookingRequestId: reqItem._id, expiresInHours: 72 }, { headers });
      onToast && onToast('Token generated and sent to requester in chat.', 'success');
      // Refresh lists
      const [g, t] = await Promise.all([
        axios.get(`${API_URL}/tokens/my/generated`, { headers }),
        axios.get(`${API_URL}/tokens/my/received`, { headers }),
      ]);
      setGeneratedTokens(g.data.tokens || []);
      setReceivedTokens(t.data.tokens || []);
    } catch (e: any) {
      onToast && onToast(e.response?.data?.error || 'Failed to generate token', 'error');
    }
  }

  async function openRequestChat(reqId: string) {
    if (!token || !onOpenConversation) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await axios.get(`${API_URL}/booking-requests/${reqId}`, { headers });
      const conv = res.data?.conversation;
      if (conv) onOpenConversation(conv);
      else alert('No conversation found for this request');
    } catch (e: any) {
      console.error('Open request chat error', e);
      alert(e.response?.data?.error || 'Failed to open chat');
    }
  }

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

  async function revokeToken(code: string) {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(`${API_URL}/tokens/revoke`, { code }, { headers });
      const g = await axios.get(`${API_URL}/tokens/my/generated`, { headers });
      setGeneratedTokens(g.data.tokens || []);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to revoke token');
    }
  }

  async function extendToken(code: string, hours = 24) {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      await axios.post(`${API_URL}/tokens/extend`, { code, hours }, { headers });
      const g = await axios.get(`${API_URL}/tokens/my/generated`, { headers });
      setGeneratedTokens(g.data.tokens || []);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to extend token');
    }
  }

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
            </button>
            <button
              className={`${btn('primary')} w-full sm:w-auto`}
              onClick={() => setShowCreateVenue(true)}
            >
              + Create Venue
            </button>
          </div>
        </div>

      <div className="flex flex-wrap gap-3 items-center mt-3" role="tablist" aria-label="My Activities Tabs">
        <button
          className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'events' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('events')}
          role="tab"
          aria-selected={activeTab === 'events'}
        >
          My Events ({createdEvents.length})
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
        <div className="sm:ml-auto flex items-center gap-2">
          <span className="text-sm text-theme-secondary">Show past</span>
          <button
            onClick={() => setIncludeArchived(a => !a)}
            className={`chip ${includeArchived ? 'chip-active' : ''}`}
            aria-pressed={includeArchived}
          >
            {includeArchived ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {/* helper to filter by query */}
      {/**/}

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">My Venues</h3>
        {/* Venue owner CTA removed per request */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myVenues.filter((v) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (v.name || '').toLowerCase().includes(q) ||
              (v.location?.city || '').toLowerCase().includes(q) ||
              (v.status || '').toLowerCase().includes(q)
            );
          }).map((v) => (
            <div key={v._id} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all hover:ring-2 hover:ring-[var(--accent-cyan)]/40">
              <div className="h-1 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3 opacity-80 group-hover:opacity-100" />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="text-lg font-semibold text-heading">{v.name}</div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-theme-secondary">
                    <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
                    <span>{v.location?.city || 'Location TBA'}</span>
                  </div>
                </div>
                <span className={`badge ${venueStatusStyle(v.status)}`}>{v.status}</span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-theme-secondary">
                <Users className="w-4 h-4 text-[var(--accent-amber)]" />
                <span>Capacity: {v.capacity?.max ?? '—'}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="btn w-full sm:w-auto" onClick={() => { setEditingVenue(v); setShowCreateVenue(true); }}>Edit</button>
                <button className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-auto" onClick={() => setConfirmDeleteVenueId(v._id)}>Delete</button>
              </div>
            </div>
          ))}
          {myVenues.length === 0 && <p className="text-sm text-gray-500">No venues yet.</p>}
        </div>
      </section>
      )}

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">Events I Created <span className="text-sm font-normal text-gray-500">({createdEvents.length})</span></h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {createdEvents.filter((e) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (e.title || '').toLowerCase().includes(q) ||
              (e.sport || '').toLowerCase().includes(q) ||
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
                <span className={`badge badge-violet flex items-center gap-1`}>
                  <Trophy className="w-3 h-3" /> {e.sport || 'Other'}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-theme-secondary">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[var(--accent-violet)]" />
                  <span>Starts: {new Date(e.startDate).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <Users className="w-4 h-4 text-[var(--accent-amber)]" />
                  <span>{(e.participants?.length || 0)}/{e.capacity?.max || 0}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.organizer && (
                  <button className="flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto whitespace-normal break-words text-left" onClick={() => startConversationWithUser(e.organizer?._id)}>
                    Message Participants (DM organizer)
                  </button>
                )}
                <button
                  className="btn w-full sm:w-auto"
                  onClick={() => { setEditingEvent(e); setShowCreateEvent(true); }}
                >
                  Edit
                </button>
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto"
                  onClick={() => setSelectedEvent(e)}
                >
                  View
                </button>
                <button
                  className={`inline-flex items-center px-3 py-2 rounded-md ${e.archivedAt ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-400' : 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-400'} text-white focus:outline-none focus:ring-2 w-full sm:w-auto`}
                  onClick={async () => {
                    if (!token) return;
                    const headers = { Authorization: `Bearer ${token}` };
                    const archivedAt = e.archivedAt ? null : new Date().toISOString();
                    await axios.put(`${API_URL}/events/${e._id}`, { archivedAt }, { headers });
                    const ce = await axios.get(`${API_URL}/events/my/created?includeArchived=${includeArchived}`, { headers });
                    setCreatedEvents(ce.data.events || []);
                    onToast && onToast(e.archivedAt ? 'Event restored.' : 'Event archived.', 'success');
                  }}
                >
                  {e.archivedAt ? 'Restore' : 'Archive'}
                </button>
                <button
                  className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-auto"
                  onClick={() => setConfirmDeleteEventId(e._id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {createdEvents.length === 0 && <p className="text-sm text-gray-500">No created events yet.</p>}
        </div>
      </section>
      )}

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">Events I Joined <span className="text-sm font-normal text-gray-500">({joinedEvents.length})</span></h3>
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

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">Booking Requests (Sent)</h3>
        <div className="space-y-2">
          {sentRequests.filter((r) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (r.venue?.name || '').toLowerCase().includes(q) ||
              (r.status || '').toLowerCase().includes(q)
            );
          }).map((r) => (
            <div key={r._id} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3" />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="text-lg font-semibold text-heading">{r.venue?.name}</div>
                  <div className="text-sm text-theme-secondary">Status: {r.status}</div>
                </div>
                <span className={`badge ${r.status === 'pending' ? 'badge-amber' : r.status === 'approved' ? 'badge-accent' : 'badge-violet'}`}>{r.status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => openRequestChat(r._id)}>Open Chat</button>
                <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => startConversationWithUser(r.owner?._id)}>Message Owner</button>
              </div>
            </div>
          ))}
          {sentRequests.length === 0 && <p className="text-sm text-gray-500">No sent requests.</p>}
        </div>
      </section>
      )}

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">Booking Requests (Received)</h3>
        <div className="space-y-2">
          {receivedRequests.filter((r) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (r.venue?.name || '').toLowerCase().includes(q) ||
              (r.requester?.username || '').toLowerCase().includes(q) ||
              (r.status || '').toLowerCase().includes(q)
            );
          }).map((r) => (
            <div key={r._id} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3" />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                <div>
                  <div className="text-lg font-semibold text-heading">{r.venue?.name}</div>
                  <div className="text-sm text-theme-secondary">Requester: {r.requester?.username}</div>
                  <div className="text-sm text-theme-secondary">Status: {r.status}</div>
                </div>
                <span className={`badge ${r.status === 'pending' ? 'badge-amber' : r.status === 'approved' ? 'badge-accent' : 'badge-violet'}`}>{r.status}</span>
              </div>
              {(me && String(r.owner?._id || r.owner) === String(me?._id)) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => openRequestChat(r._id)}>Open Chat</button>
                  <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => startConversationWithUser(r.requester?._id)}>Message Requester</button>
                  {r.status === 'pending' && (
                    <button className="btn w-full sm:w-auto" onClick={() => setConfirmGenerateReq(r)}>Generate Token (after payment)</button>
                  )}
                </div>
              )}
            </div>
          ))}
          {receivedRequests.length === 0 && <p className="text-sm text-gray-500">No received requests.</p>}
        </div>
      </section>
      )}

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">Generated Tokens</h3>
        <div className="space-y-2">
          {generatedTokens.filter((t) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (t.code || '').toLowerCase().includes(q) ||
              (t.venue?.name || '').toLowerCase().includes(q) ||
              (t.status || '').toLowerCase().includes(q)
            );
          }).map((t) => (
            <div key={t._id} className="themed-card rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3" />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="font-medium text-heading">{t.code}</div>
                <span className={`badge ${t.status === 'active' ? 'badge-accent' : 'badge-violet'}`}>{t.status}</span>
              </div>
              <div className="text-sm text-theme-secondary">Venue: {t.venue?.name}</div>
              <div className="text-sm text-theme-secondary">Expires: {new Date(t.expiresAt).toLocaleString()}</div>
              {me?.role === 'venue_owner' && t.status === 'active' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => extendToken(t.code, 24)}>Extend 24h</button>
                  <button className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-auto" onClick={() => revokeToken(t.code)}>Revoke</button>
                </div>
              )}
            </div>
          ))}
          {generatedTokens.length === 0 && <p className="text-sm text-gray-500">No generated tokens.</p>}
        </div>
      </section>
      )}

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">Received Tokens</h3>
        <div className="space-y-2">
          {receivedTokens.filter((t) => {
            const q = eventsQuery.toLowerCase();
            if (!q) return true;
            return (
              (t.code || '').toLowerCase().includes(q) ||
              (t.venue?.name || '').toLowerCase().includes(q) ||
              (t.status || '').toLowerCase().includes(q)
            );
          }).map((t) => (
            <div key={t._id} className="themed-card rounded-2xl p-3 sm:p-4 shadow-sm">
              <div className="h-2 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3" />
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                <div className="font-medium text-heading">{t.code}</div>
                <span className={`badge ${t.status === 'active' ? 'badge-accent' : 'badge-violet'}`}>{t.status}</span>
              </div>
              <div className="text-sm text-theme-secondary">Venue: {t.venue?.name}</div>
              <div className="text-sm text-theme-secondary">Expires: {new Date(t.expiresAt).toLocaleString()}</div>
              {t.status === 'active' && (
                <div className="mt-2">
                  <button className="btn w-full sm:w-auto" onClick={() => { setInitialEventToken(t.code); setShowCreateEvent(true); }}>
                    Use Token to Create Event
                  </button>
                </div>
              )}
            </div>
          ))}
          {receivedTokens.length === 0 && <p className="text-sm text-gray-500">No received tokens.</p>}
        </div>
      </section>
      )}

      {activeTab === 'events' && includeArchived && (
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

      </div>
    </div>
    {showCreateVenue && (
      <CreateVenueModal
        isOpen={showCreateVenue}
        onClose={() => { setEditingVenue(null); setShowCreateVenue(false); }}
        token={token}
        editVenue={editingVenue}
        onCreated={async () => {
          try {
            const headers = { Authorization: `Bearer ${token}` };
            const v = await axios.get(`${API_URL}/venues/my`, { headers });
            setMyVenues(v.data.venues || []);
            onToast && onToast('Venue created.', 'success');
          } catch {}
        }}
        onSaved={async () => {
          try {
            const headers = { Authorization: `Bearer ${token}` };
            const v = await axios.get(`${API_URL}/venues/my`, { headers });
            setMyVenues(v.data.venues || []);
            onToast && onToast('Venue updated.', 'success');
          } catch {}
        }}
      />
    )}
    <ConfirmDialog
      isOpen={!!confirmGenerateReq}
      title="Generate Booking Token"
      message="This will record a payment, create a booking token, and send it to the requester in the booking chat. Proceed?"
      confirmLabel="Generate Token"
      cancelLabel="Cancel"
      onConfirm={() => { if (confirmGenerateReq) generateTokenForRequest(confirmGenerateReq); setConfirmGenerateReq(null); }}
      onCancel={() => setConfirmGenerateReq(null)}
    />
    <ConfirmDialog
      isOpen={!!confirmLeaveEventId}
      title="Leave Event"
      message="Are you sure you want to leave this event?"
      confirmLabel="Leave"
      cancelLabel="Stay"
      onConfirm={() => {
        if (confirmLeaveEventId) leaveEvent(confirmLeaveEventId);
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
    <ConfirmDialog
      isOpen={!!confirmDeleteVenueId}
      title="Delete Venue"
      message="Delete this venue? This cannot be undone."
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={async () => {
        if (!token || !confirmDeleteVenueId) return;
        try {
          const headers = { Authorization: `Bearer ${token}` };
          await axios.delete(`${API_URL}/venues/${confirmDeleteVenueId}`, { headers });
          const vr = await axios.get(`${API_URL}/venues/my`, { headers });
          setMyVenues(vr.data.venues || []);
          onToast && onToast('Venue deleted.', 'success');
        } catch (e: any) {
          onToast && onToast(e.response?.data?.error || 'Failed to delete venue', 'error');
        } finally {
          setConfirmDeleteVenueId(null);
        }
      }}
      onCancel={() => setConfirmDeleteVenueId(null)}
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
