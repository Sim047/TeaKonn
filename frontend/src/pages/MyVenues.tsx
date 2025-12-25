import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateVenueModal from '../components/CreateVenueModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MapPin, Users } from 'lucide-react';

export default function MyVenues({ token, onToast, onNavigate, onCountChange, onUpdated }: { token: string | null, onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void, onNavigate?: (view: string) => void, onCountChange?: (count: number) => void, onUpdated?: () => void }) {
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

  async function refreshVenues() {
    if (!token) return;
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const v = await axios.get(`${API_URL}/venues/my`, { headers });
      setMyVenues(v.data.venues || []);
      onCountChange && onCountChange((v.data.venues || []).length);
    } catch {}
  }

  useEffect(() => { refreshVenues(); }, [token]);

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Venues</h2>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:justify-end w-full sm:w-auto">
            <button className={`${btn('primary')} w-full sm:w-auto`} onClick={() => setShowCreateVenue(true)}>+ Create Venue</button>
            <button className={`${btn('outline')} w-full sm:w-auto`} onClick={refreshVenues}>Refresh</button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search venues by name, city, status"
            className="input w-full sm:w-80"
            aria-label="Search venues"
          />
        </div>

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
    </div>
  );
}
