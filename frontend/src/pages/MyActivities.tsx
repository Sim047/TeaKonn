import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateVenueModal from '../components/CreateVenueModal';

export default function MyActivities({ token }: { token: string | null }) {
  const [myVenues, setMyVenues] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<any[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<any[]>([]);
  const [generatedTokens, setGeneratedTokens] = useState<any[]>([]);
  const [receivedTokens, setReceivedTokens] = useState<any[]>([]);
  const [me, setMe] = useState<any | null>(null);
  const [showCreateVenue, setShowCreateVenue] = useState(false);

  useEffect(() => {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    (async () => {
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
      } catch (e) {
        // swallow errors in dashboard
      }
    })();
  }, [token]);

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
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">My Activities</h2>

      <section>
        <h3 className="text-xl font-semibold mb-2">My Venues</h3>
        {me?.role === 'venue_owner' && (
          <button className="mb-2 px-3 py-2 rounded bg-teal-600 text-white" onClick={() => setShowCreateVenue(true)}>Create Venue</button>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {myVenues.map((v) => (
            <div key={v._id} className="rounded border p-3">
              <div className="flex justify-between"><span className="font-medium">{v.name}</span><span className="text-xs">{v.status}</span></div>
              <div className="text-sm text-gray-600">{v.location?.city}</div>
              <div className="text-sm">Capacity: {v.capacity?.max}</div>
            </div>
          ))}
          {myVenues.length === 0 && <p className="text-sm text-gray-500">No venues yet.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Booking Requests (Sent)</h3>
        <div className="space-y-2">
          {sentRequests.map((r) => (
            <div key={r._id} className="rounded border p-3">
              <div className="font-medium">{r.venue?.name}</div>
              <div className="text-sm">Status: {r.status}</div>
            </div>
          ))}
          {sentRequests.length === 0 && <p className="text-sm text-gray-500">No sent requests.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Booking Requests (Received)</h3>
        <div className="space-y-2">
          {receivedRequests.map((r) => (
            <div key={r._id} className="rounded border p-3">
              <div className="font-medium">{r.venue?.name}</div>
              <div className="text-sm">Requester: {r.requester?.username}</div>
              <div className="text-sm">Status: {r.status}</div>
              {me?.role === 'venue_owner' && r.status === 'pending' && (
                <div className="mt-2">
                  <button className="px-3 py-2 rounded bg-cyan-600 text-white" onClick={() => generateTokenForRequest(r)}>Generate Token (after payment)</button>
                </div>
              )}
            </div>
          ))}
          {receivedRequests.length === 0 && <p className="text-sm text-gray-500">No received requests.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Generated Tokens</h3>
        <div className="space-y-2">
          {generatedTokens.map((t) => (
            <div key={t._id} className="rounded border p-3">
              <div className="font-medium">{t.code}</div>
              <div className="text-sm">Venue: {t.venue?.name}</div>
              <div className="text-sm">Status: {t.status} | Expires: {new Date(t.expiresAt).toLocaleString()}</div>
              {me?.role === 'venue_owner' && t.status === 'active' && (
                <div className="mt-2 flex gap-2">
                  <button className="px-3 py-2 rounded border" onClick={() => extendToken(t.code, 24)}>Extend 24h</button>
                  <button className="px-3 py-2 rounded border border-red-500 text-red-600" onClick={() => revokeToken(t.code)}>Revoke</button>
                </div>
              )}
            </div>
          ))}
          {generatedTokens.length === 0 && <p className="text-sm text-gray-500">No generated tokens.</p>}
        </div>
      </section>

      <section>
        <h3 className="text-xl font-semibold mb-2">Received Tokens</h3>
        <div className="space-y-2">
          {receivedTokens.map((t) => (
            <div key={t._id} className="rounded border p-3">
              <div className="font-medium">{t.code}</div>
              <div className="text-sm">Venue: {t.venue?.name}</div>
              <div className="text-sm">Status: {t.status} | Expires: {new Date(t.expiresAt).toLocaleString()}</div>
            </div>
          ))}
          {receivedTokens.length === 0 && <p className="text-sm text-gray-500">No received tokens.</p>}
        </div>
      </section>
    </div>
    {showCreateVenue && (
      <CreateVenueModal isOpen={showCreateVenue} onClose={() => setShowCreateVenue(false)} token={token} onCreated={async () => {
        try {
          const headers = { Authorization: `Bearer ${token}` };
          const v = await axios.get(`${API_URL}/venues/my`, { headers });
          setMyVenues(v.data.venues || []);
        } catch {}
      }} />
    )}
  );
}
