import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateVenueModal from '../components/CreateVenueModal';
import CreateEventModal from '../components/CreateEventModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MapPin, Users, Search as SearchIcon } from 'lucide-react';

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
  const [venuesSubTab, setVenuesSubTab] = useState<'sent' | 'received' | 'generated' | 'receivedTokens'>(() => {
    const saved = localStorage.getItem('myvenues.tab');
    return (saved === 'received' || saved === 'generated' || saved === 'receivedTokens') ? (saved as any) : 'sent';
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
      else onToast && onToast('No conversation found for this request', 'warning');
    } catch (e: any) {
      onToast && onToast(e.response?.data?.error || 'Failed to open chat', 'error');
    }
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
        // Graceful fallback: no global search endpoint — clear results
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
  useEffect(() => { localStorage.setItem('myvenues.tab', venuesSubTab); }, [venuesSubTab]);

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

        <div className="flex flex-wrap gap-2 mt-4" role="tablist" aria-label="Venues Subtabs">
          <button
            className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${venuesSubTab === 'sent' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
            onClick={() => setVenuesSubTab('sent')}
            role="tab"
            aria-selected={venuesSubTab === 'sent'}
          >
            Sent Requests ({sentRequests.length})
          </button>
          <button
            className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${venuesSubTab === 'received' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
            onClick={() => setVenuesSubTab('received')}
            role="tab"
            aria-selected={venuesSubTab === 'received'}
          >
            Received Requests ({receivedRequests.length})
          </button>
          <button
            className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${venuesSubTab === 'generated' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
            onClick={() => setVenuesSubTab('generated')}
            role="tab"
            aria-selected={venuesSubTab === 'generated'}
          >
            Generated Tokens ({generatedTokens.length})
          </button>
          <button
            className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${venuesSubTab === 'receivedTokens' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
            onClick={() => setVenuesSubTab('receivedTokens')}
            role="tab"
            aria-selected={venuesSubTab === 'receivedTokens'}
          >
            Received Tokens ({receivedTokens.length})
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative w-full sm:w-96">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search venues, requests, tokens"
              aria-label="Search venues"
              className="input pl-9 pr-3"
            />
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Search Scope">
            <button
              className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${searchScope === 'mine' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
              onClick={() => setSearchScope('mine')}
              role="tab"
              aria-selected={searchScope === 'mine'}
            >
              My Venues ({myVenues.length})
            </button>
            <button
              className={`w-full sm:w-auto text-sm px-3 py-2 rounded-md border bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 ${searchScope === 'all' ? 'border-b-2 border-indigo-500 text-indigo-600 dark:text-indigo-400' : ''}`}
              onClick={() => setSearchScope('all')}
              role="tab"
              aria-selected={searchScope === 'all'}
            >
              All Venues
            </button>
          </div>
        </div>

        {searchScope === 'mine' && (
        <section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {myVenues.filter((v) => {
              const q = query.toLowerCase();
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

        {searchScope === 'all' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">All Venues</h3>
            {loadingSearch && <span className="text-sm text-theme-secondary">Loading…</span>}
          </div>
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
        </section>
        )}

        {venuesSubTab === 'sent' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Booking Requests (Sent)</h3>
          </div>
          <div className="space-y-2">
            {sentRequests.filter((r) => {
              const q = query.toLowerCase();
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

        {venuesSubTab === 'received' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Booking Requests (Received)</h3>
          </div>
          <div className="space-y-2">
            {receivedRequests.filter((r) => {
              const q = query.toLowerCase();
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

        {venuesSubTab === 'generated' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Generated Tokens</h3>
          </div>
          <div className="space-y-2">
            {generatedTokens.filter((t) => {
              const q = query.toLowerCase();
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

        {venuesSubTab === 'receivedTokens' && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold">Received Tokens</h3>
          </div>
          <div className="space-y-2">
            {receivedTokens.filter((t) => {
              const q = query.toLowerCase();
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
