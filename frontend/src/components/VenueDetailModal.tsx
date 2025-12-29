// frontend/src/components/VenueDetailModal.tsx
import React from 'react';
import { X, MapPin, Users, Image as ImageIcon, MessageCircle } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../config/api';

interface VenueDetailModalProps {
  venue: any | null;
  onClose: () => void;
  token?: string | null;
}

export default function VenueDetailModal({ venue, onClose, token }: VenueDetailModalProps) {
  const [submitting, setSubmitting] = React.useState(false);
  const API = API_URL.replace(/\/api$/, '');

  if (!venue) return null;

  async function requestBooking() {
    try {
      if (!token) return;
      setSubmitting(true);
      await axios.post(
        `${API}/api/booking-requests/create`,
        { venueId: venue._id },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      try {
        alert('Booking request sent');
      } catch {}
    } catch (e: any) {
      console.error('Request booking failed', e);
      alert(e.response?.data?.error || 'Failed to send booking request');
    } finally {
      setSubmitting(false);
    }
  }

  const img = Array.isArray(venue.images) && venue.images.length > 0 ? venue.images[0] : null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-xl font-bold text-heading">{venue.name || 'Venue'}</h2>
          <button onClick={onClose} className="p-2 rounded-md hover:opacity-80 themed-card">
            <X className="w-5 h-5" />
          </button>
        </div>

        {img ? (
          <div className="w-full h-60 sm:h-72 overflow-hidden">
            <img src={img} alt={venue.name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full h-48 flex items-center justify-center themed-card">
            <ImageIcon className="w-10 h-10 text-theme-secondary" />
          </div>
        )}

        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-theme-secondary">
            <MapPin className="w-4 h-4" />
            <span>{venue.location?.city || venue.location?.name || 'Location TBA'}</span>
          </div>
          {venue.capacity?.max !== undefined && (
            <div className="flex items-center gap-2 text-theme-secondary">
              <Users className="w-4 h-4" />
              <span>Capacity: {venue.capacity?.max}</span>
            </div>
          )}
          {venue.description && (
            <div>
              <div className="text-sm text-theme-secondary">About</div>
              <p className="text-heading whitespace-pre-wrap break-words">{venue.description}</p>
            </div>
          )}

          <div className="pt-2 border-t flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
            <button
              className="btn px-3 py-2 text-sm"
              onClick={requestBooking}
              disabled={!token || submitting}
            >
              {submitting ? 'Sending…' : 'Request Booking'}
            </button>
            <button
              className="themed-card px-3 py-2 text-sm flex items-center gap-2"
              onClick={() => {
                if (venue.owner) {
                  try { localStorage.setItem('auralink-open-chat-with', String(venue.owner)); } catch {}
                }
                window.location.href = '/?view=dashboard';
              }}
            >
              <MessageCircle className="w-4 h-4" /> Contact Owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
