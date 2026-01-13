import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateVenueModal from '../components/CreateVenueModal';
import CreateEventModal from '../components/CreateEventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MapPin, Users, Search as SearchIcon, Send, Inbox, KeyRound, Shield, Plus, ChevronDown } from 'lucide-react';

export default function MyVenues({ token, onToast, onNavigate, onCountChange, onUpdated, onOpenConversation }: { token: string | null, onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void, onNavigate?: (view: string) => void, onCountChange?: (count: number) => void, onUpdated?: () => void, onOpenConversation?: (conv: any) => void }) {
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

  const venueStatusStyle = (raw?: string) => {
    const s = (raw || '').toLowerCase();
    if (s.includes('avail')) return 'badge-accent';
    if (s.includes('closed')) return 'badge-violet';
    if (s.includes('maint')) return 'badge-amber';
    if (s.includes('book')) return 'badge-amber';
    return '';
  };

  const tabBtn = (active: boolean) =>
    [
      'w-full sm:w-auto inline-flex items-center gap-2 px-3 py-2 rounded-md border text-sm transition-all focus-visible:outline-none focus-visible:ring-2',
      active
        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-transparent shadow-sm focus-visible:ring-indigo-400'
        : 'bg-white dark:bg-gray-800 text-theme-secondary border hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:ring-indigo-400',
    ].join(' ');

  const countPill = (active: boolean) =>
    [
      'ml-2 px-2 py-0.5 rounded-full text-xs font-semibold',
      active ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    ].join(' ');

  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any | null>(null);
  const [confirmDeleteVenueId, setConfirmDeleteVenueId] = useState<string | null>(null);
  const [query, setQuery] = useState<string>('');
  const [searchScope, setSearchScope] = useState<'mine' | 'all'>(() => {
    const saved = localStorage.getItem('myvenues.scope');
    return saved === 'all' ? 'all' : 'mine';
  });
  const [allVenues, setAllVenues] = useState<any[]>([]);
  const [allVenuesPage, setAllVenuesPage] = useState<number>(1);
  const [allVenuesHasMore, setAllVenuesHasMore] = useState<boolean>(false);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [me, setMe] = useState<any | null>(null);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [generatedTokens, setGeneratedTokens] = useState<any[]>([]);
  const [receivedTokens, setReceivedTokens] = useState<any[]>([]);
  const [confirmGenerateReq, setConfirmGenerateReq] = useState<any | null>(null);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [initialEventToken, setInitialEventToken] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [eventsByVenue, setEventsByVenue] = useState<Record<string, any[]>>({});
  const [loadingVenueEvents, setLoadingVenueEvents] = useState<Record<string, boolean>>({});
  const [insightModeByVenue, setInsightModeByVenue] = useState<Record<string, 'requests' | 'events'>>({});
  const [globalInsightsMode, setGlobalInsightsMode] = useState<'nonPendingRequests' | 'generated' | 'received' | 'inactiveEvents'>('nonPendingRequests');
  const [loadingAllVenueEvents, setLoadingAllVenueEvents] = useState(false);
  const [showAllVenues, setShowAllVenues] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.all.show') || 'true'); } catch { return true; }
  });
  const [showMyVenues, setShowMyVenues] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.mine.show') || 'true'); } catch { return true; }
  });
  const [showSent, setShowSent] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.sent.show') || 'false'); } catch { return false; }
  });
  const [showReceived, setShowReceived] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.received.show') || 'false'); } catch { return false; }
  });
  const [showGenerated, setShowGenerated] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.generated.show') || 'false'); } catch { return false; }
  });
  const [showReceivedTokens, setShowReceivedTokens] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.receivedTokens.show') || 'false'); } catch { return false; }
  });
  const [showOtherInsights, setShowOtherInsights] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myvenues.otherInsights.show') || 'true'); } catch { return true; }
  });

  async function refreshVenues() {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const meRes = await axios.get(`${API_URL}/users/me`, { headers });
      setMe(meRes.data || null);
      const [v, s, r, g, t] = await Promise.all([
        axios.get(`${API_URL}/venues/my`, { headers }),
        axios.get(`${API_URL}/booking-requests/my/sent`, { headers }),
        axios.get(`${API_URL}/booking-requests/my/received`, { headers }),
        axios.get(`${API_URL}/tokens/my/generated`, { headers }),
        axios.get(`${API_URL}/tokens/my/received`, { headers }),
      ]);
      setMyVenues(v.data.venues || []);
      setSentRequests(s.data.requests || []);
      setReceivedRequests(r.data.requests || []);
      setGeneratedTokens(g.data.tokens || []);
      setReceivedTokens(t.data.tokens || []);
      onCountChange && onCountChange((v.data.venues || []).length);
    } catch {}
  }

  async function startConversationWithUser(userId: string) {
    if (!token || !onOpenConversation) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const res = await axios.post(`${API_URL.replace(/\/api$/, '')}/api/users/conversations/start`, { partnerId: userId }, { headers });
      if (res.data) onOpenConversation(res.data);
    } catch (e: any) {
      onToast && onToast(e.response?.data?.error || 'Could not start conversation', 'error');
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
      onToast && onToast(e.response?.data?.error || 'Failed to revoke token', 'error');
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
      onToast && onToast(e.response?.data?.error || 'Failed to extend token', 'error');
    }
  }

  useEffect(() => { refreshVenues(); }, [token]);
  useEffect(() => { localStorage.setItem('myvenues.scope', searchScope); }, [searchScope]);

  async function searchAllVenues(q: string, page = 1, limit = 50) {
    setLoadingSearch(true);
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined as any;
    try {
      const res = await axios.get(`${API_URL}/venues/search`, { params: { name: q, page, limit }, headers });
      const items = (res.data?.venues || res.data?.results || res.data || []) as any[];
      setAllVenues(page === 1 ? items : [...allVenues, ...items]);
      setAllVenuesPage(page);
      const hasMore = (res.data?.totalPages !== undefined && res.data?.page !== undefined)
        ? (res.data.page < res.data.totalPages)
        : (items.length >= limit);
      setAllVenuesHasMore(hasMore);
    } catch (e) {
      setAllVenues(page === 1 ? [] : allVenues);
      setAllVenuesHasMore(false);
    } finally {
      setLoadingSearch(false);
    }
  }

  useEffect(() => {
    if (searchScope !== 'all') return;
    const q = query.trim();
    const t = setTimeout(() => { searchAllVenues(q, 1); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, searchScope]);

  useEffect(() => { localStorage.setItem('myvenues.all.show', JSON.stringify(showAllVenues)); }, [showAllVenues]);
  useEffect(() => { localStorage.setItem('myvenues.mine.show', JSON.stringify(showMyVenues)); }, [showMyVenues]);
  useEffect(() => { localStorage.setItem('myvenues.sent.show', JSON.stringify(showSent)); }, [showSent]);
  useEffect(() => { localStorage.setItem('myvenues.received.show', JSON.stringify(showReceived)); }, [showReceived]);
  useEffect(() => { localStorage.setItem('myvenues.generated.show', JSON.stringify(showGenerated)); }, [showGenerated]);
  useEffect(() => { localStorage.setItem('myvenues.receivedTokens.show', JSON.stringify(showReceivedTokens)); }, [showReceivedTokens]);
  useEffect(() => { localStorage.setItem('myvenues.otherInsights.show', JSON.stringify(showOtherInsights)); }, [showOtherInsights]);
        

  async function loadEventsForVenue(venueId: string) {
    if (!venueId) return;
    if (loadingVenueEvents[venueId]) return;
    setLoadingVenueEvents((m) => ({ ...m, [venueId]: true }));
    try {
      const res = await axios.get(`${API_URL}/events/by-venue/${venueId}`, { params: { includeArchived: true, limit: 50 } });
      const list = res.data?.events || [];
      setEventsByVenue((m) => ({ ...m, [venueId]: list }));
    } catch {
      setEventsByVenue((m) => ({ ...m, [venueId]: [] }));
    } finally {
      setLoadingVenueEvents((m) => ({ ...m, [venueId]: false }));
    }
  }

  async function generateTokenForRequest(reqItem: any) {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const idempotencyKey = `br_${reqItem._id}`;
      await axios.post(`${API_URL}/payments/initiate`, { bookingRequestId: reqItem._id, amount: 1000, currency: 'KES', idempotencyKey }, { headers });
      await axios.post(`${API_URL}/payments/callback`, { status: 'success', idempotencyKey });
      await axios.post(`${API_URL}/tokens/generate`, { bookingRequestId: reqItem._id, expiresInHours: 72 }, { headers });
      onToast && onToast('Token generated and sent to requester in chat.', 'success');
      const [g, t] = await Promise.all([
        axios.get(`${API_URL}/tokens/my/generated`, { headers }),
        axios.get(`${API_URL}/tokens/my/received`, { headers }),
      ]);
      setGeneratedTokens(g.data.tokens || []);
      setReceivedTokens(t.data.tokens || []);
      setReceivedRequests((prev) => prev.map((r) => r._id === reqItem._id ? { ...r, status: 'token_generated' } : r));
    } catch (e: any) {
      onToast && onToast(e.response?.data?.error || 'Failed to generate token', 'error');
    }
  }

  function isEventActive(ev: any) {
    const status = (ev?.status || '').toLowerCase();
    if (status === 'active') return true;
    try {
      const now = Date.now();
      const start = ev?.startDate ? new Date(ev.startDate).getTime() : undefined;
      const end = ev?.endDate ? new Date(ev.endDate).getTime() : undefined;
      if (end !== undefined) return end >= now; // ongoing or upcoming
      if (start !== undefined) return start >= now - 1000 * 60 * 60 * 4; // allow slight grace
    } catch {}
    return false;
  }

  async function loadAllVenueEventsIfNeeded() {
    if (loadingAllVenueEvents) return;
    const missing = myVenues.map(v => String(v._id)).filter(id => !eventsByVenue[id]);
    if (!missing.length) return;
    setLoadingAllVenueEvents(true);
    try {
      await Promise.all(missing.map(async (id) => {
        try {
          const res = await axios.get(`${API_URL}/events/by-venue/${id}`, { params: { includeArchived: true, limit: 100 } });
          setEventsByVenue((m) => ({ ...m, [id]: res.data?.events || [] }));
        } catch {
          setEventsByVenue((m) => ({ ...m, [id]: [] }));
        }
      }));
    } finally {
      setLoadingAllVenueEvents(false);
    }
  }

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Venues</h2>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:justify-end w-full sm:w-auto">
            <button className={`${btn('primary')} w-full sm:w-auto`} onClick={() => setShowCreateVenue(true)}>+ Create Venue</button>
            <button className={`${btn('outline')} w-full sm:w-auto`} onClick={refreshVenues}>Refresh</button>
            {me?.role === 'venue_owner' && (
              <button
                className={`${btn('warning')} w-full sm:w-auto`}
                onClick={async () => {
                  if (!token) return;
                  const headers = { Authorization: `Bearer ${token}` };
                  try {
                    const res = await axios.post(`${API_URL}/venues/unlock-all`, {}, { headers });
                    onToast && onToast(`Unlocked ${res.data?.updatedCount ?? 0} venues`, 'success');
                    await refreshVenues();
                  } catch (e: any) {
                    onToast && onToast(e.response?.data?.error || 'Failed to unlock all venues', 'error');
                  }
                }}
              >Unlock All</button>
            )}
          </div>
        </div>

        {/* Filters temporarily removed: to be reintroduced as search-bar toggles */}

        <div className="-mx-3 sm:mx-0">
          <div className="p-[1px] bg-gradient-to-r from-cyan-400 to-purple-500 rounded-none sm:rounded-xl">
            <div className="flex items-center gap-1 themed-card rounded-none sm:rounded-xl px-1 py-1 w-full flex-nowrap" style={{ background: 'var(--card)' }}>
              <button
                className={`px-2 py-1 text-[12px] font-semibold leading-tight rounded-md flex-none border transition-colors ${
                  searchScope === 'mine'
                    ? 'bg-cyan-600 text-white border-cyan-500'
                    : 'bg-purple-600 text-white border-purple-500'
                }`}
                onClick={() => setSearchScope((s) => (s === 'mine' ? 'all' : 'mine'))}
                aria-label="Toggle search scope"
                title={searchScope === 'mine' ? 'Searching My Venues' : 'Searching All Venues'}
              >
                {searchScope === 'mine' ? 'My Venues' : 'All Venues'}
              </button>
              <input
                type="text"
                className="input h-9 text-sm flex-1 min-w-0 rounded-md bg-white/60 dark:bg-slate-800/60 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder:text-slate-500 dark:placeholder:text-slate-400 placeholder:opacity-90 dark:placeholder:opacity-80"
                placeholder="Search venues"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search venues"
              />
              <button
                onClick={() => setShowCreateVenue(true)}
                aria-label="Create venue"
                className="p-1 rounded-md transition-all flex-none bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                title="Create venue"
              >
                <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          </div>
        </div>

        {searchScope === 'mine' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">My Venues</h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme-secondary">Show</span>
              <button
                className={`chip ${showMyVenues ? 'chip-active' : ''}`}
                onClick={() => setShowMyVenues((s) => !s)}
                aria-pressed={showMyVenues}
              >{showMyVenues ? 'On' : 'Off'}</button>
            </div>
          </div>
          {showMyVenues ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {myVenues.filter((v) => {
                const q = query.toLowerCase();
                if (!q) return true;
                return (
                  (v.name || '').toLowerCase().includes(q) ||
                  (v.location?.city || '').toLowerCase().includes(q) ||
                  (v.status || '').toLowerCase().includes(q)
                );
              }).map((v) => {
                const venueId = String(v._id);
                const genForVenue = generatedTokens.filter((t) => String(t.venue?._id || t.venue) === venueId);
                const recForVenue = receivedTokens.filter((t) => String(t.venue?._id || t.venue) === venueId);
                const isOpen = !!expanded[venueId];
                return (
                <div key={venueId} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all hover:ring-2 hover:ring-[var(--accent-cyan)]/40">
                  <div className="h-1 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3 opacity-80 group-hover:opacity-100" />
                  {Array.isArray(v.images) && v.images.length > 0 && (
                    <div className="relative w-full h-40 sm:h-48 overflow-hidden rounded-xl mb-3">
                      <img src={v.images[0]} alt={v.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-transparent" />
                    </div>
                  )}
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
                    <button
                      className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto"
                      onClick={async () => {
                        setExpanded((m) => ({ ...m, [venueId]: !isOpen }));
                        if (!isOpen && !eventsByVenue[venueId]) await loadEventsForVenue(venueId);
                      }}
                      aria-expanded={isOpen}
                    >
                      <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      Insights
                    </button>
                  </div>

                  {isOpen && (
                    <div className="mt-3 rounded-xl border p-3 sm:p-4" style={{ borderColor: 'var(--border)' }}>
                      {/* Controls: dropdown */}
                      {(() => {
                        const mode = insightModeByVenue[venueId] || 'requests';
                        const containerAccent =
                          mode === 'requests'
                            ? 'ring-1 ring-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20'
                            : mode === 'events'
                            ? 'ring-1 ring-sky-500/30 bg-sky-50 dark:bg-sky-950/20'
                            : '';
                        const setMode = (m: 'requests' | 'events') => setInsightModeByVenue((map) => ({ ...map, [venueId]: m }));
                        const receivedForVenue = receivedRequests.filter((r) => String(r.venue?._id || r.venue) === venueId && (r.status || '').toLowerCase() === 'pending');
                        return (
                          <>
                            <div className="flex">
                              <select
                                className="input text-sm h-9 w-full sm:w-64"
                                value={mode}
                                onChange={(e) => setMode(e.target.value as any)}
                                aria-label="Select insight type"
                              >
                                <option value="requests">Received Requests</option>
                                <option value="events">Events Using Venue</option>
                              </select>
                            </div>
                            <p className="mt-2 text-xs text-theme-secondary">Showing pending requests and active events only.</p>

                            {/* Scrollable content area */}
                            <div
                              className={`mt-3 max-h-[50vh] overflow-y-auto pr-1 rounded-lg border ${containerAccent}`}
                              style={{ borderColor: 'var(--border)', WebkitOverflowScrolling: 'touch' as any }}
                            >
                              {mode === 'requests' && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Received Requests</h4>
                                    <span className="text-xs text-theme-secondary">{receivedForVenue.length}</span>
                                  </div>
                                  {receivedForVenue.length ? (
                                    <div className="space-y-2">
                                      {receivedForVenue.map((r) => (
                                        <div key={r._id} className="rounded-lg border px-3 py-2 space-y-1" style={{ borderColor: 'var(--border)' }}>
                                          <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium">{r.venue?.name}</div>
                                            <span className={`badge ${r.status === 'pending' ? 'badge-amber' : r.status === 'approved' ? 'badge-accent' : 'badge-violet'}`}>{r.status}</span>
                                          </div>
                                          <div className="text-xs text-theme-secondary">Requester: {r.requester?.username}</div>
                                          <div className="mt-2 flex flex-wrap gap-2">
                                            <button className="inline-flex items-center px-2.5 py-1.5 rounded-md border text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => startConversationWithUser(r.requester?._id)}>Message Requester</button>
                                            {(me && String(r.owner?._id || r.owner) === String(me?._id) && r.status === 'pending') && (
                                              <button className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-emerald-600 text-white text-xs" onClick={() => setConfirmGenerateReq(r)}>Generate Token</button>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-theme-secondary">No received requests for this venue.</div>
                                  )}
                                </div>
                              )}

                              {mode === 'events' && (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-semibold">Events Using This Venue</h4>
                                    <span className="text-xs text-theme-secondary">{(eventsByVenue[venueId] || []).filter(isEventActive).length}{loadingVenueEvents[venueId] ? '…' : ''}</span>
                                  </div>
                                  {loadingVenueEvents[venueId] ? (
                                    <div className="text-xs text-theme-secondary">Loading events…</div>
                                  ) : (eventsByVenue[venueId] && eventsByVenue[venueId].filter(isEventActive).length ? (
                                    <div className="space-y-2">
                                      {eventsByVenue[venueId].filter(isEventActive).map((ev: any) => (
                                        <div key={ev._id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                                          <div className="text-sm font-medium line-clamp-1">{ev.title}</div>
                                          <div className="text-xs text-theme-secondary">Starts: {new Date(ev.startDate).toLocaleString()}</div>
                                          <div className="text-xs text-theme-secondary">By {ev.organizer?.username || 'Organizer'}</div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-xs text-theme-secondary">No active events linked to this venue.</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );})}
              {myVenues.length === 0 && <p className="text-sm text-gray-500">No venues yet.</p>}
            </div>
          ) : null}
        </section>
        )}

        {searchScope === 'all' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">All Venues</h3>
            <div className="flex items-center gap-2">
              {loadingSearch && <span className="text-sm text-theme-secondary">Loading…</span>}
              <span className="text-sm text-theme-secondary">Show</span>
              <button
                className={`chip ${showAllVenues ? 'chip-active' : ''}`}
                onClick={() => setShowAllVenues((s) => !s)}
                aria-pressed={showAllVenues}
              >{showAllVenues ? 'On' : 'Off'}</button>
            </div>
          </div>
          {showAllVenues ? (
            <>
              {query.trim().length < 2 && (
                <div className="text-sm text-gray-500">
                  <p>Browse all available venues or refine with search.</p>
                  {myVenues.length > 0 && (
                    <button
                      className="mt-2 inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40"
                      onClick={() => setSearchScope('mine')}
                    >
                      View My Venues ({myVenues.length})
                    </button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allVenues.map((v: any) => (
                  <div key={v._id || `${v.name}-${v.location?.city}`} className="group themed-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-lg transition-all">
                    <div className="h-1 w-full rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)] mb-3 opacity-80" />
                    {Array.isArray(v.images) && v.images.length > 0 && (
                      <div className="relative w-full h-40 sm:h-48 overflow-hidden rounded-xl mb-3">
                        <img src={v.images[0]} alt={v.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-transparent" />
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <div className="text-lg font-semibold text-heading">{v.name}</div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-theme-secondary">
                          <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
                          <span>{v.location?.city || 'Location TBA'}</span>
                        </div>
                      </div>
                      {v.status && <span className={`badge ${venueStatusStyle(v.status)}`}>{v.status}</span>}
                    </div>
                    {v.capacity?.max && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-theme-secondary">
                        <Users className="w-4 h-4 text-[var(--accent-amber)]" />
                        <span>Capacity: {v.capacity?.max}</span>
                      </div>
                    )}
                    {v.owner?._id && (
                      <div className="mt-3">
                        <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => startConversationWithUser(v.owner?._id)}>
                          Message Owner
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {query.trim().length >= 2 && (
                <div className="mt-3">
                  <button
                    className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40"
                    onClick={() => searchAllVenues(query.trim(), allVenuesPage + 1)}
                    disabled={!allVenuesHasMore || loadingSearch}
                  >
                    {loadingSearch ? 'Loading…' : allVenuesHasMore ? 'Load more' : 'No more results'}
                  </button>
                </div>
              )}
              {query.trim().length >= 2 && !loadingSearch && allVenues.length === 0 && (
                <p className="text-sm text-gray-500">No venues found.</p>
              )}
            </>
          ) : null}
        </section>
        )}

        

        

        {/* Global/Other Insights section for large-scale management */}
        <section className="mt-6">
          <div className="mb-2">
            <h3 className="text-xl font-semibold">Other Insights</h3>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-theme-secondary">Show</span>
              <button
                className={`chip ${showOtherInsights ? 'chip-active' : ''}`}
                onClick={() => setShowOtherInsights(s => !s)}
                aria-pressed={showOtherInsights}
                aria-label="Toggle Other Insights visibility"
              >
                {showOtherInsights ? 'On' : 'Off'}
              </button>
            </div>
            <div>
              <select
                className="input h-9 text-sm w-full sm:w-auto"
                value={globalInsightsMode}
                onChange={async (e) => {
                  const v = e.target.value as typeof globalInsightsMode;
                  setGlobalInsightsMode(v);
                  if (v === 'inactiveEvents') await loadAllVenueEventsIfNeeded();
                }}
                aria-label="Select insight type"
              >
                <option value="nonPendingRequests">Non-pending Requests</option>
                <option value="generated">Tokens Generated</option>
                <option value="received">Tokens Received</option>
                <option value="inactiveEvents">Inactive/Past Events</option>
              </select>
            </div>
          </div>

          {showOtherInsights && (
          <div
            className={`rounded-lg border p-3 max-h-[55vh] overflow-y-auto ${
              globalInsightsMode === 'nonPendingRequests' ? 'ring-1 ring-amber-500/30 bg-amber-50 dark:bg-amber-950/20' :
              globalInsightsMode === 'generated' ? 'ring-1 ring-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20' :
              globalInsightsMode === 'received' ? 'ring-1 ring-violet-500/30 bg-violet-50 dark:bg-violet-950/20' :
              'ring-1 ring-slate-500/30 bg-slate-50 dark:bg-slate-900/20'
            }`}
            style={{ borderColor: 'var(--border)', WebkitOverflowScrolling: 'touch' as any }}
          >
            {globalInsightsMode === 'nonPendingRequests' && (
              <div className="space-y-2">
                {receivedRequests.filter(r => (r.status || '').toLowerCase() !== 'pending').map((r) => (
                  <div key={r._id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{r.venue?.name}</div>
                      <span className={`badge ${r.status === 'approved' ? 'badge-accent' : 'badge-violet'}`}>{r.status}</span>
                    </div>
                    <div className="text-xs text-theme-secondary">Requester: {r.requester?.username}</div>
                    <div className="mt-2">
                      <button className="inline-flex items-center px-2.5 py-1.5 rounded-md border text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => startConversationWithUser(r.requester?._id)}>Message Requester</button>
                    </div>
                  </div>
                ))}
                {receivedRequests.filter(r => (r.status || '').toLowerCase() !== 'pending').length === 0 && (
                  <div className="text-xs text-theme-secondary">No non-pending requests.</div>
                )}
              </div>
            )}

            {globalInsightsMode === 'generated' && (
              <div className="space-y-2">
                {generatedTokens.map((t) => (
                  <div key={t._id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-sm font-medium">{t.code}</div>
                    <div className="flex items-center gap-2 text-xs text-theme-secondary">
                      <span className={`badge ${t.status === 'active' ? 'badge-accent' : 'badge-violet'}`}>{t.status}</span>
                      <span>Exp: {new Date(t.expiresAt).toLocaleString()}</span>
                    </div>
                    {t.status === 'active' && (
                      <div className="w-full sm:w-auto flex gap-2">
                        <button className="inline-flex items-center px-2.5 py-1.5 rounded-md border text-xs" style={{ borderColor: 'var(--border)' }} onClick={() => extendToken(t.code, 24)}>Extend 24h</button>
                        <button className="inline-flex items-center px-2.5 py-1.5 rounded-md bg-rose-600 text-white text-xs" onClick={() => revokeToken(t.code)}>Revoke</button>
                      </div>
                    )}
                  </div>
                ))}
                {generatedTokens.length === 0 && <div className="text-xs text-theme-secondary">No generated tokens.</div>}
              </div>
            )}

            {globalInsightsMode === 'received' && (
              <div className="space-y-2">
                {receivedTokens.map((t) => (
                  <div key={t._id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                    <div className="text-sm font-medium">{t.code}</div>
                    <div className="flex items-center gap-2 text-xs text-theme-secondary">
                      <span className={`badge ${t.status === 'active' ? 'badge-accent' : 'badge-violet'}`}>{t.status}</span>
                      <span>Exp: {new Date(t.expiresAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
                {receivedTokens.length === 0 && <div className="text-xs text-theme-secondary">No received tokens.</div>}
              </div>
            )}

            {globalInsightsMode === 'inactiveEvents' && (
              <div className="space-y-2">
                {loadingAllVenueEvents && <div className="text-xs text-theme-secondary">Loading events…</div>}
                {!loadingAllVenueEvents && myVenues
                  .flatMap(v => (eventsByVenue[String(v._id)] || []))
                  .filter(ev => !isEventActive(ev))
                  .map((ev: any) => (
                    <div key={ev._id} className="rounded-lg border px-3 py-2" style={{ borderColor: 'var(--border)' }}>
                      <div className="text-sm font-medium line-clamp-1">{ev.title}</div>
                      <div className="text-xs text-theme-secondary">Starts: {new Date(ev.startDate).toLocaleString()}</div>
                      {ev.endDate && <div className="text-xs text-theme-secondary">Ended: {new Date(ev.endDate).toLocaleString()}</div>}
                    </div>
                  ))}
                {!loadingAllVenueEvents && myVenues.flatMap(v => (eventsByVenue[String(v._id)] || [])).filter(ev => !isEventActive(ev)).length === 0 && (
                  <div className="text-xs text-theme-secondary">No inactive/past events.</div>
                )}
              </div>
            )}
          </div>
          )}
        </section>

        

        
      </div>

      {showCreateVenue && (
        <CreateVenueModal
          isOpen={showCreateVenue}
          onClose={() => { setEditingVenue(null); setShowCreateVenue(false); }}
          token={token}
          editVenue={editingVenue}
          onCreated={async () => {
            try {
              await refreshVenues();
              onToast && onToast('Venue created.', 'success');
              onUpdated && onUpdated();
            } catch {}
          }}
          onSaved={async () => {
            try {
              await refreshVenues();
              onToast && onToast('Venue updated.', 'success');
              onUpdated && onUpdated();
            } catch {}
          }}
        />
      )}

      {showCreateEvent && (
        <CreateEventModal
          isOpen={showCreateEvent}
          onClose={() => { setShowCreateEvent(false); setInitialEventToken(''); }}
          token={token}
          initialToken={initialEventToken}
          editingEvent={null}
          onSuccess={async () => {
            try {
              await refreshVenues();
            } catch {}
            setShowCreateEvent(false);
            setInitialEventToken('');
            onToast && onToast('Event created.', 'success');
          }}
        />
      )}

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
            await refreshVenues();
            onToast && onToast('Venue deleted.', 'success');
            onUpdated && onUpdated();
          } catch (e: any) {
            onToast && onToast(e.response?.data?.error || 'Failed to delete venue', 'error');
          } finally {
            setConfirmDeleteVenueId(null);
          }
        }}
        onCancel={() => setConfirmDeleteVenueId(null)}
      />

      <ConfirmDialog
        isOpen={!!confirmGenerateReq}
        title="Generate Booking Token"
        message="This will record a payment, create a booking token, and send it to the requester in the booking chat. Proceed?"
        confirmLabel="Generate Token"
        cancelLabel="Cancel"
        onConfirm={() => { if (confirmGenerateReq) generateTokenForRequest(confirmGenerateReq); setConfirmGenerateReq(null); }}
        onCancel={() => setConfirmGenerateReq(null)}
      />
    </div>
  );
}
