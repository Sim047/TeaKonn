import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { Calendar, MapPin, Tag as TagIcon } from 'lucide-react';
import VenueDetailModal from '../components/VenueDetailModal';
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
  const [city, setCity] = useState('');
  const [minCap, setMinCap] = useState('');
  const [maxCap, setMaxCap] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(true);
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
            <p className="text-sm text-theme-secondary">Find and request bookings. Results are ranked by recency, availability, images, and size.</p>
          </div>
        </div>

        <div className="themed-card rounded-2xl p-3 sm:p-4 border" style={{ borderColor: 'var(--border)' }}>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <input className="input" placeholder="Search anything (name, city, address)" value={q} onChange={(e) => setQ(e.target.value)} />
            <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
            <input className="input" placeholder="Min capacity" type="number" value={minCap} onChange={(e) => setMinCap(e.target.value)} />
            <input className="input" placeholder="Max capacity" type="number" value={maxCap} onChange={(e) => setMaxCap(e.target.value)} />
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
              <span>Only available</span>
            </label>
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
                className="group themed-card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer"
                onClick={() => setSelectedVenue(v)}
                role="button"
                aria-label={`View venue ${v.name}`}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedVenue(v); } }}
              >
                {img && (
                  <div className="relative w-full h-40 sm:h-48 overflow-hidden">
                    <img src={img} alt={v.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-transparent" />
                  </div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-lg font-bold text-heading">{v.name}</div>
                      <div className="text-sm text-theme-secondary inline-flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {city || 'Location TBA'}
                      </div>
                    </div>
                    <span className={`badge ${v.status === 'available' ? 'badge-accent' : 'badge-amber'}`}>{v.status}</span>
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
                      className="themed-card px-3 py-1.5 text-sm"
                      onClick={(e) => { e.stopPropagation(); requestBooking(v._id); }}
                    >
                      Request Booking
                    </button>
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
    </div>
  );
}
