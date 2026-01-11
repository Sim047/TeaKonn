// Notifications Page - View all notifications
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bell, ArrowLeft, Calendar, Loader, MapPin, Users, Check, UserPlus, MessageSquare } from 'lucide-react';

dayjs.extend(relativeTime);

import { API_URL } from '../config/api';
import { socket } from '../socket';
const API = API_URL.replace(/\/api$/, '');

export default function Notifications({ token, onBack }: any) {
  const [eventsNotifs, setEventsNotifs] = useState<any[]>([]);
  const [bookingNotifs, setBookingNotifs] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'upcoming' | 'past'>('upcoming');
  const [filter, setFilter] = useState<'all' | 'events' | 'bookings' | 'followers'>('all');
  const [bookingModal, setBookingModal] = useState<{ open: boolean; data?: any }>(() => ({ open: false }));
  const [tokenModal, setTokenModal] = useState<{ open: boolean; data?: any }>(() => ({ open: false }));
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  // Realtime updates: listen to socket notifications and booking status updates
  useEffect(() => {
    function onNotification(payload: any) {
      try {
        if (!payload || !payload.kind) return;
        if (payload.kind === 'follow') {
          setFollowers((prev) => [
            {
              id: payload.user?._id || Math.random().toString(36),
              kind: 'follow',
              title: payload.title || `${payload.user?.username || 'Someone'} followed you`,
              message: payload.message || '',
              user: payload.user,
            },
            ...prev,
          ]);
        } else if (payload.kind === 'booking_received') {
          const item = {
            id: payload.bookingRequestId || Math.random().toString(36),
            kind: payload.kind,
            title: payload.title,
            message: payload.message,
            date: payload.date || new Date().toISOString(),
            venue: payload.venue,
            requester: payload.requester,
            owner: payload.owner,
            status: payload.status,
            conversation: payload.conversation,
          } as any;
          setBookingNotifs((prev) => [item, ...prev]);
        } else if (payload.kind === 'booking_token') {
          const item = {
            id: (payload.bookingRequestId || '') + '-token',
            kind: 'booking_token',
            title: payload.title || 'Your request has a response',
            message: payload.message || `A response was issued for ${payload.venue?.name || 'your request'}`,
            date: payload.date || new Date().toISOString(),
            venue: payload.venue,
            requester: payload.requester,
            owner: payload.owner,
            status: 'token_generated',
            token: payload.token,
          } as any;
          setBookingNotifs((prev) => [item, ...prev]);
        }
      } catch (e) {
        console.warn('Notification handler failed', e);
      }
    }

    function onBookingStatusUpdate({ bookingId, status, message }: any) {
      const item = {
        id: String(bookingId || Math.random().toString(36)),
        kind: 'booking_sent',
        title: 'Booking update',
        message: message || `Status: ${status}`,
        date: new Date().toISOString(),
        status,
      } as any;
      setBookingNotifs((prev) => [item, ...prev]);
    }

    try {
      socket.on('notification', onNotification);
      socket.on('booking_status_update', onBookingStatusUpdate);
    } catch {}
    return () => {
      try {
        socket.off('notification', onNotification);
        socket.off('booking_status_update', onBookingStatusUpdate);
      } catch {}
    };
  }, []);

  async function loadAll() {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` } as any;
      const [eventsRes, receivedRes, sentRes, meRes] = await Promise.all([
        axios.get(`${API}/api/events?status=published&limit=100`, { headers }),
        axios.get(`${API}/api/booking-requests/my/received`, { headers }),
        axios.get(`${API}/api/booking-requests/my/sent`, { headers }),
        axios.get(`${API}/api/users/me`, { headers }),
      ]);

      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const eventsRaw = (eventsRes.data.events || []);
      const events = eventsRaw.filter((event: any) => {
        const d = new Date(event.startDate);
        return timeframe === 'upcoming' ? (d >= now && d <= thirtyDaysFromNow) : (d < now && d >= thirtyDaysAgo);
      });
      const eventNotifications = events.map((event: any) => ({
        id: event._id,
        kind: 'event',
        title: `${timeframe === 'upcoming' ? 'Upcoming' : 'Recent'}: ${event.title}`,
        message: `${dayjs(event.startDate).format('MMM D, YYYY')} • ${event.location?.city || event.location?.name || 'TBD'}`,
        time: dayjs(event.startDate).fromNow(),
        date: event.startDate,
        event,
      }));

      setEventsNotifs(eventNotifications);

      // Booking requests (received + sent)
      const received = (receivedRes.data?.requests || []).map((r: any) => ({
        id: r._id,
        kind: 'booking_received',
        title: `New booking request for ${r.venue?.name || 'your venue'}`,
        message: `From ${r.requester?.username || 'someone'}`,
        date: r.createdAt || new Date().toISOString(),
        venue: r.venue,
        requester: r.requester,
        owner: r.owner,
        status: r.status,
        conversation: r.conversation?._id || r.conversation,
      }));
      // Requester side: do not include sent requests here; only show when token is generated via realtime notification
      const sent: any[] = [];
      setBookingNotifs([...received, ...sent]);

      // Followers
      const me = meRes.data || {};
      const followersList = (me.followers || []).map((u: any) => ({
        id: u._id,
        kind: 'follow',
        title: `${u.username || 'Someone'} followed you`,
        message: '',
        user: u,
      }));
      setFollowers(followersList);
      setCurrentUser(me);
    } catch (err) {
      console.error('Load notifications error:', err);
    } finally {
      setLoading(false);
    }
  }

  const merged = useMemo(() => {
    const all = [
      ...eventsNotifs,
      ...bookingNotifs,
      // followers have no timestamp on relationship; include separately unless filtered specifically
    ];
    return all.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [eventsNotifs, bookingNotifs]);

  async function openChatWith(userId: string) {
    try {
      const res = await axios.post(`${API}/api/conversations`, { partnerId: userId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      localStorage.setItem('auralink-active-conversation', JSON.stringify(res.data));
      localStorage.setItem('auralink-in-dm', 'true');
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'chat');
      window.location.href = url.toString();
    } catch (e) {
      console.error('Open chat failed', e);
      alert('Could not open chat. Please try again.');
    }
  }

  async function openConversationById(convId: string) {
    try {
      const res = await axios.get(`${API}/api/conversations`, { headers: { Authorization: `Bearer ${token}` } });
      const conv = (res.data || []).find((c: any) => String(c._id) === String(convId));
      if (!conv) {
        alert('Conversation not found. Try starting a new chat.');
        return;
      }
      localStorage.setItem('auralink-active-conversation', JSON.stringify(conv));
      localStorage.setItem('auralink-in-dm', 'true');
      const url = new URL(window.location.href);
      url.searchParams.set('view', 'chat');
      window.location.href = url.toString();
    } catch (e) {
      console.error('Open conversation by id failed', e);
      alert('Could not open existing conversation. Please try again.');
    }
  }

  async function viewBookingRequest(brId: string) {
    try {
      const res = await axios.get(`${API}/api/booking-requests/${brId}`, { headers: { Authorization: `Bearer ${token}` } });
      setBookingModal({ open: true, data: res.data });
    } catch (e) {
      try {
        const status = (e as any)?.response?.status;
        if (status === 403) {
          alert('You are not authorized to view this booking request. Try replying in chat instead.');
          return;
        }
      } catch {}
      console.error('View booking request failed', e);
    }
  }

  return (
    <>
    <div className="min-h-screen themed-page">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-theme-secondary hover:text-heading mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Notifications</h1>
              <p className="text-theme-secondary">All your important updates in one place</p>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-theme-secondary mr-2">Timeframe:</span>
              <button
                className={`px-3 py-1 rounded-lg text-sm border ${timeframe === 'upcoming' ? 'bg-cyan-600 text-white border-cyan-500' : ''}`}
                onClick={() => setTimeframe('upcoming')}
              >Upcoming</button>
              <button
                className={`px-3 py-1 rounded-lg text-sm border ${timeframe === 'past' ? 'bg-purple-600 text-white border-purple-500' : ''}`}
                onClick={() => setTimeframe('past')}
              >Past 30 days</button>
              <span className="mx-3 h-6 w-px bg-[var(--border)]" />
              <span className="text-sm text-theme-secondary mr-2">Filter:</span>
              <button className={`px-3 py-1 rounded-lg text-sm border ${filter==='all'?'bg-blue-600 text-white border-blue-500':''}`} onClick={()=>setFilter('all')}>All</button>
              <button className={`px-3 py-1 rounded-lg text-sm border ${filter==='events'?'bg-blue-600 text-white border-blue-500':''}`} onClick={()=>setFilter('events')}>Events</button>
              <button className={`px-3 py-1 rounded-lg text-sm border ${filter==='bookings'?'bg-blue-600 text-white border-blue-500':''}`} onClick={()=>setFilter('bookings')}>Bookings</button>
              <button className={`px-3 py-1 rounded-lg text-sm border ${filter==='followers'?'bg-blue-600 text-white border-blue-500':''}`} onClick={()=>setFilter('followers')}>Followers</button>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (filter==='followers' ? followers.length===0 : (filter==='events'? eventsNotifs.length===0 : (filter==='bookings'? bookingNotifs.length===0 : merged.length===0))) ? (
          <div className="rounded-2xl p-12 text-center themed-card">
            <Bell className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">No notifications</h3>
            <p className="text-theme-secondary">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(filter==='followers' ? followers : (filter==='events'? eventsNotifs : (filter==='bookings'? bookingNotifs : merged))).map((notif: any) => (
              <div
                key={notif.id}
                className="rounded-2xl p-6 hover:shadow-lg transition-all duration-300 group themed-card"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ' + (
                      notif.kind==='event' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      notif.kind?.startsWith('booking') ? 'bg-green-100 dark:bg-green-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    )}
                  >
                    {notif.kind==='event' && (<Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />)}
                    {notif.kind?.startsWith('booking') && (<Check className="w-6 h-6 text-green-600 dark:text-green-400" />)}
                    {notif.kind==='follow' && (<UserPlus className="w-6 h-6 text-blue-600 dark:text-blue-400" />)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-heading mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {notif.title}
                    </h3>
                    {notif.kind==='event' && (
                      <>
                        <p className="text-theme-secondary mb-3 flex items-center gap-3">
                          <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {notif.event?.location?.city || notif.event?.location?.name || 'TBD'}</span>
                          <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {(notif.event?.participants?.length || 0)}/{(notif.event?.capacity?.max || 0)}</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={'px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}>
                            Event
                          </span>
                          <span className="text-xs text-theme-secondary">{notif.time}</span>
                        </div>
                        {timeframe === 'upcoming' && (
                          <div className="mt-3 flex gap-2">
                            <button
                              className="px-3 py-1 rounded-lg bg-teal-600 text-white text-sm"
                              onClick={async () => {
                                try {
                                  await axios.post(`${API}/api/events/${notif.id}/join`, {}, { headers: { Authorization: `Bearer ${token}` } });
                                } catch (e) {
                                  console.warn('Join failed');
                                }
                              }}
                            >Join</button>
                            <a
                              className="px-3 py-1 rounded-lg border text-sm"
                              style={{ borderColor: 'var(--border)' }}
                              href="#"
                              onClick={(ev) => ev.preventDefault()}
                            >View Event</a>
                          </div>
                        )}
                      </>
                    )}

                    {notif.kind==='booking_received' && (
                      <>
                        <p className="text-theme-secondary mb-3">Venue: {notif.venue?.name || 'Venue'}</p>
                        <div className="flex items-center gap-2">
                          <span className={'px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}>
                            Booking Request
                          </span>
                          <span className="text-xs text-theme-secondary">{dayjs(notif.date).fromNow()}</span>
                        </div>
                        <div className="mt-3">
                          <span className="px-3 py-1 rounded-lg text-sm border" style={{ borderColor: 'var(--border)' }}>
                            You have a booking request for this venue.
                          </span>
                        </div>
                      </>
                    )}

                    {notif.kind==='booking_token' && (
                      <>
                        <p className="text-theme-secondary mb-3">Venue: {notif.venue?.name || 'Venue'}</p>
                        <div className="flex items-center gap-2">
                          <span className={'px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}>
                            Response Received
                          </span>
                          <span className="text-xs text-theme-secondary">{dayjs(notif.date).fromNow()}</span>
                        </div>
                        <div className="mt-3">
                          <span className="px-3 py-1 rounded-lg text-sm border" style={{ borderColor: 'var(--border)' }}>
                            Your request has a response.
                          </span>
                        </div>
                      </>
                    )}

                    {notif.kind==='follow' && (
                      <>
                        <p className="text-theme-secondary mb-3">{notif.user?.username || 'Someone'} is now following you.</p>
                        <div className="flex items-center gap-2">
                          <span className={'px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}>
                            Follow
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    {/* Booking Request Modal */}
    {bookingModal.open && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setBookingModal({ open: false })}>
        <div className="rounded-2xl p-6 themed-card w-[90%] max-w-lg" onClick={(e)=>e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-3">Booking Request</h3>
          <div className="text-sm text-theme-secondary mb-4">{bookingModal.data?.venue?.name || 'Venue'}</div>
          <div className="space-y-2 text-sm">
            <div><strong>Requester:</strong> {bookingModal.data?.requester?.username || 'User'}</div>
            <div><strong>Status:</strong> {bookingModal.data?.status}</div>
            {bookingModal.data?.notes ? (<div><strong>Notes:</strong> {bookingModal.data.notes}</div>) : null}
          </div>
          <div className="mt-4 flex gap-2">
            <button className="px-3 py-1 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} onClick={()=>{
              const convId = bookingModal.data?.conversation?._id || bookingModal.data?.conversation;
              if (convId) openConversationById(convId);
              else openChatWith(bookingModal.data?.requester?._id || bookingModal.data?.requester);
            }}>Open Chat</button>
            <button className="px-3 py-1 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} onClick={()=>setBookingModal({ open: false })}>Close</button>
          </div>
        </div>
      </div>
    )}

    {/* Token Modal */}
    {tokenModal.open && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={()=>setTokenModal({ open: false })}>
        <div className="rounded-2xl p-6 themed-card w-[90%] max-w-md" onClick={(e)=>e.stopPropagation()}>
          <h3 className="text-lg font-bold mb-3">Booking Token</h3>
          <div className="text-sm mb-2"><strong>Code:</strong> {tokenModal.data?.code || '—'}</div>
          <div className="text-sm mb-4"><strong>Expires:</strong> {tokenModal.data?.expiresAt ? dayjs(tokenModal.data.expiresAt).format('MMM D, YYYY h:mm A') : '—'}</div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-lg border text-sm" style={{ borderColor: 'var(--border)' }} onClick={()=>setTokenModal({ open: false })}>Close</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
