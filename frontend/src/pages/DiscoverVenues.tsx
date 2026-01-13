import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { MapPin, Plus } from 'lucide-react';
import VenueDetailModal from '../components/VenueDetailModal';
import CreateVenueModal from '../components/CreateVenueModal';
import { API_URL } from '../config/api';

type Venue = {
  _id: string;
  name: string;
  location: { name?: string; city?: string; address?: string; state?: string; country?: string };
  capacity: { max: number };
  owner: string | { _id: string; username?: string; avatar?: string };
  status: 'available' | 'booked';
  available?: boolean;
  description?: string;
  images?: string[];
  createdAt?: string;
};

const API = API_URL.replace(/\/api$/, '');

export default function DiscoverVenues({ token }: { token: string | null }) {
  const [q, setQ] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showCreateVenue, setShowCreateVenue] = useState(false);
  // Future filters (hidden for now)
  const city = '';
  const minCap = '';
  const maxCap = '';
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Venue[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const debounced = useMemo(() => ({ q, city, minCap, maxCap, onlyAvailable }), [q, city, minCap, maxCap, onlyAvailable]);

  function primaryImage(v: Venue) {
    return Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : undefined;
  }

  function scoreVenue(v: Venue, seed: number) {
    const ta = v.createdAt ? dayjs(v.createdAt).valueOf() : 0;
    const ageHours = Math.max(0, (Date.now() - ta) / (1000 * 60 * 60));
    const recency = 1 / (1 + ageHours / 24);
    const imageBoost = primaryImage(v) ? 0.15 : 0;
    const availBoost = v.available || v.status === 'available' ? 0.15 : 0;
    const cap = v.capacity?.max || 0;
    const capScore = Math.min(1, cap / 200); // soft boost up to 200
    // simple seeded noise
    const id = String(v._id || v.name || '') + ':' + seed;
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
    const noise = ((h >>> 0) % 1000) / 1000; // 0..1
    return recency * 0.55 + imageBoost + availBoost + capScore * 0.1 + noise * 0.1;
  }

  async function fetchPage(reset = false) {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const nextPage = reset ? 1 : page + 1;
      const params: any = { page: reset ? 1 : nextPage, limit: 12 };
      if (debounced.q.trim()) params.q = debounced.q.trim();
      if (debounced.city.trim()) params.city = debounced.city.trim();
      if (debounced.minCap.trim()) params.capacityMin = debounced.minCap.trim();
      if (debounced.maxCap.trim()) params.capacityMax = debounced.maxCap.trim();
      if (debounced.onlyAvailable) params.onlyAvailable = 'true';
      const res = await axios.get(`${API_URL}/venues/search`, { params });
      const list: Venue[] = res.data?.venues || [];
      const seed = Date.now() >>> 0;
      const sorted = list.slice().sort((a, b) => scoreVenue(b, seed) - scoreVenue(a, seed));
      if (reset) {
        setItems(sorted);
        setPage(1);
      } else {
        setItems((arr) => [...arr, ...sorted]);
        setPage(nextPage);
      }
      const totalPages = res.data?.totalPages || 1;
      const current = reset ? 1 : nextPage;
      setHasMore(current < totalPages);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load venues');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(() => { fetchPage(true); }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  async function requestBooking(venueId: string) {
    if (!token) {
      setError('You must be logged in to request a booking');
      return;
    }
    try {
      const target = items.find((v) => v._id === venueId);
      const name = target?.name || 'this venue';
      const ok = typeof window !== 'undefined' ? window.confirm(`Send a booking request for ${name}?`) : true;
      if (!ok) return;
      await axios.post(`${API_URL}/booking-requests/create`, { venueId }, { headers: { Authorization: `Bearer ${token}` } });
      alert('Booking request created. Check chat for negotiation.');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to create booking request');
    }
  }

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Discover Venues</h2>
            <p className="mt-1 text-[13px] sm:text-sm leading-relaxed text-theme-secondary max-w-prose">
              <span>Find and request bookings.</span>
              <span className="hidden sm:inline"> Results are ranked by recency, availability, images, and size.</span>
              <span className="sm:hidden"> Ranked by recency, availability, images, and size.</span>
            </p>
          </div>
        </div>

        {/* Posts-style single search bar (no left toggle) */}
        <div className="-mx-3 sm:mx-0">
          <div className="p-[1px] bg-gradient-to-r from-cyan-400 to-purple-500 rounded-none sm:rounded-xl">
            <div className="flex items-center gap-0.5 themed-card rounded-none sm:rounded-xl px-1 py-0 w-full flex-nowrap" style={{ background: 'var(--card)' }}>
              <input
                type="text"
                className="input h-8 text-sm flex-1 min-w-0 rounded-md bg-white/60 dark:bg-slate-800/60 focus:ring-2 focus:ring-cyan-400 focus:outline-none placeholder:text-theme-secondary"
                placeholder="Search venues"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search venues"
              />
              <button
                onClick={() => setShowCreateVenue(true)}
                aria-label="Create venue"
                className="p-0.5 rounded-md transition-all flex-none bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20"
                title="Create venue"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </button>
            </div>
          </div>
        </div>

        {error && <div className="text-red-600 text-sm">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((v) => {
            const img = primaryImage(v);
            const city = v.location?.city || v.location?.name || '';
            return (
              <div
                key={v._id}
                className="group cursor-pointer"
                onClick={() => setSelectedVenue(v)}
                role="button"
                aria-label={`View venue ${v.name}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVenue(v); } }}
              >
                <div className="p-[1px] rounded-2xl bg-gradient-to-r from-cyan-400/60 to-purple-500/60 group-hover:from-cyan-400 group-hover:to-purple-500 transition-colors">
                  <div className="themed-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-gradient-to-br from-slate-200/50 to-slate-300/30 dark:from-slate-800/40 dark:to-slate-900/40">
                      {img ? (
                        <img src={img} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm text-theme-secondary">No image</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/0 to-transparent" />
                      <div className="absolute top-2 right-2">
                        <span className={`badge ${v.status === 'available' ? 'badge-accent' : 'badge-amber'}`}>{v.status}</span>
                      </div>
                    </div>
                    <div className="p-3 sm:p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-lg font-semibold text-heading leading-tight">{v.name}</div>
                          <div className="text-sm text-theme-secondary inline-flex items-center gap-1 mt-0.5">
                            <MapPin className="w-4 h-4" /> {city || 'Location TBA'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm text-theme-secondary">Capacity: {v.capacity?.max ?? '-'}</div>
                      <div className="pt-2 flex flex-wrap items-center gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        <button
                          className="btn px-3 py-1.5 text-sm"
                          onClick={(e) => { e.stopPropagation(); setSelectedVenue(v); }}
                        >
                          View Venue
                        </button>
                        <button
                          className="px-3 py-1.5 text-sm rounded-md border hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-colors"
                          style={{ borderColor: 'var(--border)' }}
                          onClick={(e) => { e.stopPropagation(); requestBooking(v._id); }}
                        >
                          Request Booking
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center pt-2">
          {hasMore ? (
            <button className="px-4 py-2 rounded-xl border text-sm" style={{ borderColor: 'var(--border)' }} onClick={() => fetchPage(false)} disabled={loading}>
              {loading ? 'Loading…' : 'Load more'}
            </button>
          ) : (
            <span className="text-sm text-theme-secondary">No more results</span>
          )}
        </div>
      </div>

      {selectedVenue && (
        <VenueDetailModal venue={selectedVenue as any} token={token} onClose={() => setSelectedVenue(null)} />
      )}
      {showCreateVenue && (
        <CreateVenueModal
          isOpen={showCreateVenue}
          token={token}
          onClose={() => setShowCreateVenue(false)}
          editVenue={null}
          onCreated={() => { setShowCreateVenue(false); fetchPage(true); }}
          onSaved={() => { setShowCreateVenue(false); fetchPage(true); }}
        />
      )}
    </div>
  );
}
