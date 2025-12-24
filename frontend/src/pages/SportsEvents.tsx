import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ArrowRight } from 'lucide-react';
import dayjs from 'dayjs';
import { API_URL } from '../config/api';
import EventDetailModal from '../components/EventDetailModal';
import PaymentTransactionModal from '../components/PaymentTransactionModal';
import NotificationToast from '../components/NotificationToast';

interface Event {
  _id: string;
  title: string;
  sport: string;
  description: string;
  date: string;
  time: string;
  location: any;
  maxParticipants: number;
  participants: any[];
  organizer: { _id: string; username: string; avatar?: string };
  requiresApproval: boolean;
  pricing?: { type: string; amount: number; currency: string; paymentInstructions?: string };
  image?: string;
}

interface Props {
  token: string | null;
  onViewProfile?: (user: any) => void;
  onStartConversation?: (id: string) => void;
}

export default function SportsEvents({ token, onViewProfile }: Props) {
  const API = API_URL.replace(/\/api$/, '');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<{ show: boolean; event: Event | null }>({
    show: false,
    event: null,
  });

  // Decode current user id from JWT for modal participant checks
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  useEffect(() => {
    try {
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setCurrentUserId(payload.id || payload._id);
      } else {
        // Fallback: try localStorage user
        try {
          const raw = localStorage.getItem('user');
          if (raw) {
            const u = JSON.parse(raw);
            setCurrentUserId(u?._id || u?.id);
          } else {
            setCurrentUserId(undefined);
          }
        } catch {
          setCurrentUserId(undefined);
        }
      }
    } catch {
      setCurrentUserId(undefined);
    }
  }, [token]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/events?status=published`);
      setEvents(res.data.events || res.data);
    } catch (err) {
      console.error('SportsEvents: fetchEvents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to join events', type: 'info' });
      return;
    }

    const ev = events.find((e) => e._id === eventId) || selectedEvent;
    const title = ev?.title ? ev.title : 'this event';
    const confirmJoin = window.confirm(`Do you want to join ${title}?`);
    if (!confirmJoin) return;

    if (ev && ev.pricing?.type === 'paid') {
      setPaymentModalData({ show: true, event: ev });
      return;
    }

    try {
      const res = await axios.post(
        `${API}/api/events/${eventId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotification({ message: res.data.message || 'Joined event', type: 'success' });
      await fetchEvents();
      // Refresh selectedEvent in modal so it reflects joined state
      if (selectedEvent && selectedEvent._id === eventId) {
        const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSelectedEvent(refreshed.data as any);
      }
    } catch (err: any) {
      setNotification({ message: err?.response?.data?.message || 'Failed to join', type: 'error' });
    }
  };

  const handlePaymentSubmit = async (transactionCode: string, transactionDetails: string) => {
    if (!paymentModalData.event || !token) return;
    try {
      const res = await axios.post(
        `${API}/api/events/${paymentModalData.event._id}/join`,
        { transactionCode, transactionDetails },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPaymentModalData({ show: false, event: null });
      setNotification({ message: res.data.message || 'Request submitted', type: 'success' });
      await fetchEvents();
    } catch (err: any) {
      setPaymentModalData({ show: false, event: null });
      setNotification({
        message: err?.response?.data?.message || 'Failed to submit payment',
        type: 'error',
      });
    }
  };

  const handlePaymentCancel = () => setPaymentModalData({ show: false, event: null });

  const handleLeaveEvent = async (eventId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to leave events', type: 'info' });
      return;
    }
    const ev = events.find((e) => e._id === eventId) || selectedEvent;
    const title = ev?.title ? ev.title : 'this event';
    const confirmLeave = window.confirm(`Leave ${title}? You will be removed from participants.`);
    if (!confirmLeave) return;
    try {
      await axios.post(
        `${API}/api/events/${eventId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setNotification({ message: 'Left event', type: 'success' });
      await fetchEvents();
      // Refresh selectedEvent if open
      if (selectedEvent && selectedEvent._id === eventId) {
        const refreshed = await axios.get(`${API}/api/events/${eventId}`);
        setSelectedEvent(refreshed.data);
      }
    } catch (err: any) {
      setNotification({ message: err?.response?.data?.error || 'Failed to leave', type: 'error' });
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto py-8">
        <h1 className="text-3xl font-bold mb-4">Sports Events</h1>
        <p className="text-sm text-slate-400 mb-6">Find and join local sports events.</p>

        <div className="grid gap-4">
          {events.map((ev) => (
            <div key={ev._id} className="p-4 border rounded-lg flex justify-between items-center">
              <div>
                <div className="font-semibold">{ev.title}</div>
                <div className="text-xs text-slate-400">
                  {dayjs(ev.date).format('MMM D, YYYY')} •{' '}
                  {ev.location?.city || ev.location?.address || 'Online'}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    try {
                      const resp = await axios.get(`${API}/api/events/${ev._id}`);
                      setSelectedEvent(resp.data as any);
                    } catch {
                      setSelectedEvent(ev);
                    }
                  }}
                  className="text-sm text-cyan-600"
                >
                  Details
                </button>
                <button
                  onClick={() => handleJoinEvent(ev._id)}
                  className="px-3 py-1 bg-cyan-600 text-white rounded"
                >
                  Join
                </button>
              </div>
            </div>
          ))}
        </div>

        {selectedEvent && (
          <EventDetailModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            onJoin={() => handleJoinEvent(selectedEvent._id)}
            onLeave={(eventId: string) => handleLeaveEvent(eventId)}
            currentUserId={currentUserId}
          />
        )}

        <PaymentTransactionModal
          show={paymentModalData.show}
          event={paymentModalData.event}
          onCancel={handlePaymentCancel}
          onSubmit={handlePaymentSubmit}
        />

        {notification && (
          <NotificationToast
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </div>
    </div>
  );
}
