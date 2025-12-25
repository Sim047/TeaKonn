import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateVenueModal from '../components/CreateVenueModal';
import CreateEventModal from '../components/CreateEventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import EventDetailModal from '../components/EventDetailModal';
import MyServices from './MyServices';
import MyProducts from './MyProducts';

export default function MyActivities({ token, onOpenConversation, onNavigate, onToast }: { token: string | null, onOpenConversation?: (conv: any) => void, onNavigate?: (view: string) => void, onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void }) {
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
  const [includeArchived, setIncludeArchived] = useState<boolean>(true);
  const [servicesCount, setServicesCount] = useState<number>(0);
  const [productsCount, setProductsCount] = useState<number>(0);
  const [confirmDeleteEventId, setConfirmDeleteEventId] = useState<string | null>(null);
  const [confirmDeleteVenueId, setConfirmDeleteVenueId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'services' | 'products'>('events');

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
      alert('Token generated and sent in chat.');
      // Refresh lists
      const [g, t] = await Promise.all([
        axios.get(`${API_URL}/tokens/my/generated`, { headers }),
        axios.get(`${API_URL}/tokens/my/received`, { headers }),
      ]);
      setGeneratedTokens(g.data.tokens || []);
      setReceivedTokens(t.data.tokens || []);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to generate token');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Activities</h2>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
              onClick={() => { setInitialEventToken(''); setShowCreateEvent(true); }}
            >
              + Create Event
            </button>
            <button
              className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              onClick={() => setShowCreateVenue(true)}
            >
              + Create Venue
            </button>
          </div>
        </div>

      <div className="flex flex-wrap gap-3 items-center mt-3" role="tablist" aria-label="My Activities Tabs">
        <button
          className={`text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'events' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('events')}
          role="tab"
          aria-selected={activeTab === 'events'}
        >
          My Events ({createdEvents.length})
        </button>
        <button
          className={`text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'services' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('services')}
          role="tab"
          aria-selected={activeTab === 'services'}
        >
          My Services ({servicesCount})
        </button>
        <button
          className={`text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${activeTab === 'products' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
          onClick={() => setActiveTab('products')}
          role="tab"
          aria-selected={activeTab === 'products'}
        >
          My Products ({productsCount})
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <button
          className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
          onClick={refreshAll}
        >
          Refresh
        </button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm">Show past</span>
          <button
            onClick={() => setIncludeArchived(a => !a)}
            className={`text-sm px-3 py-1 rounded-full border shadow-sm transition-colors ${includeArchived ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-black' : 'bg-white dark:bg-gray-800 text-gray-700'}`}
            aria-pressed={includeArchived}
          >
            {includeArchived ? 'On' : 'Off'}
          </button>
        </div>
      </div>

      {activeTab === 'events' && (
      <section>
        <h3 className="text-xl font-semibold mb-2">My Venues</h3>
        {/* Venue owner CTA removed per request */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myVenues.map((v) => (
            <div key={v._id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 hover:ring-1 hover:ring-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{v.name}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">{v.location?.city}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{v.status}</span>
              </div>
              <div className="mt-2 text-sm">Capacity: {v.capacity?.max}</div>
              <div className="mt-3 flex gap-2">
                <button className="px-3 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" onClick={() => { setEditingVenue(v); setShowCreateVenue(true); }}>Edit</button>
                <button className="px-3 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 focus:outline-none focus:ring-2 focus:ring-red-300" onClick={() => setConfirmDeleteVenueId(v._id)}>Delete</button>
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
          {createdEvents.map((e) => (
            <div key={e._id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 hover:ring-1 hover:ring-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{e.title}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">{e.location?.city || e.location?.name}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{e.sport || 'Other'}</span>
              </div>
              <div className="mt-2 text-sm">Starts: {new Date(e.startDate).toLocaleString()}</div>
              <div className="text-sm">Participants: {(e.participants?.length || 0)}/{e.capacity?.max || 0}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.organizer && (
                  <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => startConversationWithUser(e.organizer?._id)}>
                    Message Participants (DM organizer)
                  </button>
                )}
                <button
                  className="px-3 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  onClick={() => { setEditingEvent(e); setShowCreateEvent(true); }}
                >
                  Edit
                </button>
                <button
                  className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={() => setSelectedEvent(e)}
                >
                  View
                </button>
                <button
                  className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
                  className="px-3 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 focus:outline-none focus:ring-2 focus:ring-red-300"
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
          {joinedEvents.map((e) => (
            <div key={e._id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 hover:ring-1 hover:ring-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{e.title}</div>
                  <div className="text-sm text-gray-700 dark:text-gray-200">{e.location?.city || e.location?.name}</div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Organized by {e.organizer?.username}</span>
              </div>
              <div className="mt-2 text-sm">Starts: {new Date(e.startDate).toLocaleString()}</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.organizer?._id && (
                  <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => startConversationWithUser(e.organizer._id)}>
                    Message Organizer
                  </button>
                )}
                <button
                  className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
                  onClick={() => setSelectedEvent(e)}
                >
                  View
                </button>
                <button
                  className="px-3 py-2 rounded-md bg-red-600 text-white disabled:opacity-50 shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-400"
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
          {sentRequests.map((r) => (
            <div key={r._id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 hover:ring-1 hover:ring-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{r.venue?.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Status: {r.status}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => openRequestChat(r._id)}>Open Chat</button>
                <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => startConversationWithUser(r.owner?._id)}>Message Owner</button>
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
          {receivedRequests.map((r) => (
            <div key={r._id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 hover:ring-1 hover:ring-gray-300">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">{r.venue?.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">Requester: {r.requester?.username}</div>
                  <div className="text-sm">Status: {r.status}</div>
                </div>
              </div>
              {me?.role === 'venue_owner' && r.status === 'pending' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => openRequestChat(r._id)}>Open Chat</button>
                  <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => startConversationWithUser(r.requester?._id)}>Message Requester</button>
                  <button className="px-3 py-2 rounded-md bg-cyan-600 text-white shadow hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400" onClick={() => generateTokenForRequest(r)}>Generate Token (after payment)</button>
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
          {generatedTokens.map((t) => (
            <div key={t._id} className="rounded-xl border p-4 shadow-sm bg-white dark:bg-gray-900">
              <div className="font-medium">{t.code}</div>
              <div className="text-sm">Venue: {t.venue?.name}</div>
              <div className="text-sm">Status: {t.status} | Expires: {new Date(t.expiresAt).toLocaleString()}</div>
              {me?.role === 'venue_owner' && t.status === 'active' && (
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => extendToken(t.code, 24)}>Extend 24h</button>
                  <button className="px-3 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 focus:outline-none focus:ring-2 focus:ring-red-300" onClick={() => revokeToken(t.code)}>Revoke</button>
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
          {receivedTokens.map((t) => (
            <div key={t._id} className="rounded-xl border p-4 shadow-sm bg-white dark:bg-gray-900">
              <div className="font-medium">{t.code}</div>
              <div className="text-sm">Venue: {t.venue?.name}</div>
              <div className="text-sm">Status: {t.status} | Expires: {new Date(t.expiresAt).toLocaleString()}</div>
              {t.status === 'active' && (
                <div className="mt-2">
                  <button
                    className="px-3 py-2 rounded-md bg-teal-600 text-white shadow hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400"
                    onClick={() => { setInitialEventToken(t.code); setShowCreateEvent(true); }}
                  >
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
            {archivedEvents.map((e) => (
              <div key={e._id} className="rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow bg-white dark:bg-gray-900 hover:ring-1 hover:ring-gray-300">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{e.title}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">{e.location?.city || e.location?.name}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">Ended</span>
                </div>
                <div className="mt-2 text-sm">Started: {new Date(e.startDate).toLocaleString()}</div>
                <div className="text-sm">Participants: {(e.participants?.length || 0)}</div>
                {e.organizer?._id && (
                  <div className="mt-3">
                    <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => startConversationWithUser(e.organizer._id)}>
                      Message Organizer
                    </button>
                    <button className="ml-2 px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => setSelectedEvent(e)}>
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
