import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

type Venue = {
  _id: string;
  name: string;
  location: { name?: string; city?: string; address?: string; state?: string; country?: string };
  capacity: { max: number };
  owner: string;
  status: 'available' | 'booked';
};

export default function DiscoverVenues({ token }: { token: string | null }) {
  const [query, setQuery] = useState({ name: '', city: '', capacityMin: '', capacityMax: '' });
  const [page, setPage] = useState(1);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useMemo(() => query, [query]);

  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        setLoading(true);
        setError(null);
        try {
          const params: any = { page };
          if (debouncedQuery.name) params.name = debouncedQuery.name;
          if (debouncedQuery.city) params.city = debouncedQuery.city;
          if (debouncedQuery.capacityMin) params.capacityMin = debouncedQuery.capacityMin;
          if (debouncedQuery.capacityMax) params.capacityMax = debouncedQuery.capacityMax;
          const res = await axios.get(`${API_URL}/venues/search`, { params });
          setVenues(res.data.venues || []);
          setTotalPages(res.data.totalPages || 1);
        } catch (e: any) {
          setError(e.response?.data?.error || 'Failed to load venues');
        } finally {
          setLoading(false);
        }
      })();
    }, 300);
    return () => clearTimeout(t);
  }, [debouncedQuery, page]);

  async function requestBooking(venueId: string) {
    if (!token) {
      setError('You must be logged in to request a booking');
      return;
    }
    try {
      await axios.post(`${API_URL}/booking-requests/create`, { venueId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Booking request created. Check chat for negotiation.');
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to create booking request');
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold">Discover Venues</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          className="input"
          placeholder="Search by name"
          value={query.name}
          onChange={(e) => setQuery({ ...query, name: e.target.value })}
        />
        <input
          className="input"
          placeholder="City"
          value={query.city}
          onChange={(e) => setQuery({ ...query, city: e.target.value })}
        />
        <input
          className="input"
          placeholder="Min capacity"
          type="number"
          value={query.capacityMin}
          onChange={(e) => setQuery({ ...query, capacityMin: e.target.value })}
        />
        <input
          className="input"
          placeholder="Max capacity"
          type="number"
          value={query.capacityMax}
          onChange={(e) => setQuery({ ...query, capacityMax: e.target.value })}
        />
      </div>

      {loading && <p>Loading venues...</p>}
      {error && <p className="text-red-600">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {venues.map((v) => (
          <div key={v._id} className="rounded-xl border p-4 space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">{v.name}</h3>
              <span className={`text-xs px-2 py-1 rounded ${v.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{v.status}</span>
            </div>
            <p className="text-sm text-gray-600">{v.location?.city || 'Unknown city'}</p>
            <p className="text-sm">Capacity: {v.capacity?.max ?? '-'}</p>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded bg-teal-600 text-white"
                onClick={() => requestBooking(v._id)}
              >Request Booking</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 items-center">
        <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-2 rounded border">Prev</button>
        <span>Page {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-2 rounded border">Next</button>
      </div>
    </div>
  );
}
