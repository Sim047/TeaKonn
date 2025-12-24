// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Clock, MapPin, Users, Bell, Plus, Sparkles, Trophy, Star } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import CreateEventModal from '../components/CreateEventModal';
import EventDetailModal from '../components/EventDetailModal';
import EventParticipantsModal from '../components/EventParticipantsModal';
// GlobalSearch removed from Dashboard; using inline DashboardSearch instead
import DashboardSearch from '../components/DashboardSearch';
// Removed booking-related pages
import AllEvents from './AllEvents';
import NotificationsPage from './Notifications';
import SportEvents from './SportEvents';

dayjs.extend(relativeTime);

import { API_URL } from '../config/api';
const API = API_URL.replace(/\/api$/, '');

// Comprehensive Sports Categories
const ALL_SPORTS = [
  // Olympic Sports
  { name: 'Football/Soccer', category: 'Team Sports', icon: '⚽', popular: true },
  { name: 'Basketball', category: 'Team Sports', icon: '🏀', popular: true },
  { name: 'Volleyball', category: 'Team Sports', icon: '🏐', popular: true },
  { name: 'Tennis', category: 'Racquet Sports', icon: '🎾', popular: true },
  { name: 'Swimming', category: 'Aquatic Sports', icon: '🏊', popular: true },
  { name: 'Athletics/Track & Field', category: 'Individual Sports', icon: '🏃', popular: true },
  { name: 'Gymnastics', category: 'Artistic Sports', icon: '🤸', popular: true },
  { name: 'Boxing', category: 'Combat Sports', icon: '🥊', popular: true },
  { name: 'Cycling', category: 'Individual Sports', icon: '🚴', popular: true },
  { name: 'Baseball', category: 'Team Sports', icon: '⚾', popular: true },

  // Major World Sports
  { name: 'Cricket', category: 'Team Sports', icon: '🏏', popular: true },
  { name: 'Rugby', category: 'Team Sports', icon: '🏉', popular: true },
  { name: 'Hockey (Ice)', category: 'Team Sports', icon: '🏒', popular: true },
  { name: 'Hockey (Field)', category: 'Team Sports', icon: '🏑', popular: true },
  { name: 'Golf', category: 'Individual Sports', icon: '⛳', popular: true },

  // Combat Sports
  { name: 'Wrestling', category: 'Combat Sports', icon: '🤼', popular: false },
  { name: 'Judo', category: 'Combat Sports', icon: '🥋', popular: false },
  { name: 'Karate', category: 'Combat Sports', icon: '🥋', popular: false },
  { name: 'Taekwondo', category: 'Combat Sports', icon: '🥋', popular: false },
  { name: 'Kung Fu', category: 'Combat Sports', icon: '🥋', popular: false },
  { name: 'Mixed Martial Arts (MMA)', category: 'Combat Sports', icon: '🥊', popular: true },
  { name: 'Kickboxing', category: 'Combat Sports', icon: '🥊', popular: false },
  { name: 'Muay Thai', category: 'Combat Sports', icon: '🥊', popular: false },
  { name: 'Fencing', category: 'Combat Sports', icon: '🤺', popular: false },

  // Racquet Sports
  { name: 'Badminton', category: 'Racquet Sports', icon: '🏸', popular: true },
  { name: 'Table Tennis/Ping Pong', category: 'Racquet Sports', icon: '🏓', popular: true },
  { name: 'Squash', category: 'Racquet Sports', icon: '🎾', popular: false },
  { name: 'Racquetball', category: 'Racquet Sports', icon: '🎾', popular: false },
  { name: 'Pickleball', category: 'Racquet Sports', icon: '🏸', popular: false },

  // Aquatic Sports
  { name: 'Diving', category: 'Aquatic Sports', icon: '🤿', popular: false },
  { name: 'Water Polo', category: 'Aquatic Sports', icon: '🤽', popular: false },
  { name: 'Synchronized Swimming', category: 'Aquatic Sports', icon: '🏊', popular: false },
  { name: 'Surfing', category: 'Aquatic Sports', icon: '🏄', popular: true },
  { name: 'Rowing', category: 'Aquatic Sports', icon: '🚣', popular: false },
  { name: 'Canoeing/Kayaking', category: 'Aquatic Sports', icon: '🛶', popular: false },
  { name: 'Sailing', category: 'Aquatic Sports', icon: '⛵', popular: false },

  // Winter Sports
  { name: 'Skiing (Alpine)', category: 'Winter Sports', icon: '⛷️', popular: true },
  { name: 'Skiing (Cross-Country)', category: 'Winter Sports', icon: '⛷️', popular: false },
  { name: 'Snowboarding', category: 'Winter Sports', icon: '🏂', popular: true },
  { name: 'Ice Skating', category: 'Winter Sports', icon: '⛸️', popular: true },
  { name: 'Figure Skating', category: 'Winter Sports', icon: '⛸️', popular: false },
  { name: 'Speed Skating', category: 'Winter Sports', icon: '⛸️', popular: false },
  { name: 'Curling', category: 'Winter Sports', icon: '🥌', popular: false },
  { name: 'Bobsled', category: 'Winter Sports', icon: '🛷', popular: false },
  { name: 'Luge', category: 'Winter Sports', icon: '🛷', popular: false },

  // Fitness & Wellness
  { name: 'Yoga', category: 'Fitness & Wellness', icon: '🧘', popular: true },
  { name: 'Pilates', category: 'Fitness & Wellness', icon: '🧘', popular: false },
  { name: 'CrossFit', category: 'Fitness & Wellness', icon: '💪', popular: true },
  { name: 'Aerobics', category: 'Fitness & Wellness', icon: '💃', popular: false },
  { name: 'Zumba', category: 'Fitness & Wellness', icon: '💃', popular: false },
  { name: 'Bodybuilding', category: 'Fitness & Wellness', icon: '💪', popular: false },
  { name: 'Powerlifting', category: 'Fitness & Wellness', icon: '🏋️', popular: false },
  { name: 'Weightlifting', category: 'Fitness & Wellness', icon: '🏋️', popular: false },

  // Extreme Sports
  { name: 'Skateboarding', category: 'Extreme Sports', icon: '🛹', popular: true },
  { name: 'BMX', category: 'Extreme Sports', icon: '🚴', popular: false },
  { name: 'Rock Climbing', category: 'Extreme Sports', icon: '🧗', popular: true },
  { name: 'Parkour', category: 'Extreme Sports', icon: '🤸', popular: false },
  { name: 'Bungee Jumping', category: 'Extreme Sports', icon: '🪂', popular: false },
  { name: 'Skydiving', category: 'Extreme Sports', icon: '🪂', popular: false },
  { name: 'Paragliding', category: 'Extreme Sports', icon: '🪂', popular: false },

  // Target Sports
  { name: 'Archery', category: 'Target Sports', icon: '🏹', popular: false },
  { name: 'Shooting', category: 'Target Sports', icon: '🎯', popular: false },
  { name: 'Darts', category: 'Target Sports', icon: '🎯', popular: false },

  // Motor Sports
  { name: 'Formula 1 Racing', category: 'Motor Sports', icon: '🏎️', popular: true },
  { name: 'MotoGP', category: 'Motor Sports', icon: '🏍️', popular: true },
  { name: 'NASCAR', category: 'Motor Sports', icon: '🏎️', popular: false },
  { name: 'Rally Racing', category: 'Motor Sports', icon: '🏎️', popular: false },
  { name: 'Karting', category: 'Motor Sports', icon: '🏎️', popular: false },

  // Equestrian
  { name: 'Horse Racing', category: 'Equestrian', icon: '🏇', popular: true },
  { name: 'Show Jumping', category: 'Equestrian', icon: '🏇', popular: false },
  { name: 'Dressage', category: 'Equestrian', icon: '🏇', popular: false },
  { name: 'Polo', category: 'Equestrian', icon: '🏇', popular: false },

  // Other Team Sports
  { name: 'American Football', category: 'Team Sports', icon: '🏈', popular: true },
  { name: 'Australian Rules Football', category: 'Team Sports', icon: '🏈', popular: false },
  { name: 'Handball', category: 'Team Sports', icon: '🤾', popular: false },
  { name: 'Lacrosse', category: 'Team Sports', icon: '🥍', popular: false },
  { name: 'Netball', category: 'Team Sports', icon: '🏐', popular: false },
  { name: 'Softball', category: 'Team Sports', icon: '🥎', popular: false },

  // Mind Sports & Strategy
  { name: 'Chess', category: 'Mind Sports', icon: '♟️', popular: true },
  { name: 'Checkers', category: 'Mind Sports', icon: '⚫', popular: false },
  { name: 'Go (Baduk/Weiqi)', category: 'Mind Sports', icon: '⚫', popular: false },
  { name: 'Poker', category: 'Mind Sports', icon: '🃏', popular: false },
  { name: 'Bridge', category: 'Mind Sports', icon: '🃏', popular: false },
  { name: 'Esports/Gaming', category: 'Mind Sports', icon: '🎮', popular: true },

  // Dance Sports
  { name: 'Ballroom Dancing', category: 'Dance Sports', icon: '💃', popular: false },
  { name: 'Hip Hop Dance', category: 'Dance Sports', icon: '💃', popular: false },
  { name: 'Ballet', category: 'Dance Sports', icon: '🩰', popular: false },
  { name: 'Breakdancing/Breaking', category: 'Dance Sports', icon: '🕺', popular: true },

  // Other Individual Sports
  { name: 'Triathlon', category: 'Individual Sports', icon: '🏃', popular: true },
  { name: 'Marathon Running', category: 'Individual Sports', icon: '🏃', popular: true },
  { name: 'Decathlon', category: 'Individual Sports', icon: '🏃', popular: false },
  { name: 'Pentathlon', category: 'Individual Sports', icon: '🏃', popular: false },
  { name: 'Bowling', category: 'Individual Sports', icon: '🎳', popular: false },
  { name: 'Billiards/Pool', category: 'Individual Sports', icon: '🎱', popular: false },
  { name: 'Snooker', category: 'Individual Sports', icon: '🎱', popular: false },
];

// Booking type removed as booking system is deprecated

type Event = {
  _id: string;
  title: string;
  startDate: string;
  time?: string;
  location?: any;
  capacity?: any;
  sport?: string;
  organizer?: {
    _id: string;
    username: string;
    avatar?: string;
  };
  participants?: any[];
  maxParticipants?: number;
};

export default function Dashboard({ token, onNavigate, onViewProfile }: any) {
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [eventsFilter, setEventsFilter] = useState<'all' | 'free' | 'paid'>(() => {
    const saved = localStorage.getItem('auralink-dashboard-events-filter');
    return (saved as any) || 'all';
  });
  const [showEvents, setShowEvents] = useState<boolean>(() => {
    const saved = localStorage.getItem('auralink-dashboard-show-events');
    return saved ? JSON.parse(saved) : false;
  });
  // (Removed duplicate GlobalSearch render) Only render inside the main layout below.
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  // Persist dashboard UI state
  useEffect(() => {
    localStorage.setItem('auralink-dashboard-events-filter', eventsFilter);
  }, [eventsFilter]);
  useEffect(() => {
    localStorage.setItem('auralink-dashboard-show-events', JSON.stringify(showEvents));
  }, [showEvents]);
  const [createEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'allEvents' | 'notifications'>(
    'dashboard',
  );
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);
  const [participantsModalEvent, setParticipantsModalEvent] = useState<any | null>(null);

  useEffect(() => {
    if (!token) return;
    loadDashboardData();
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) || {};
      setCurrentUserId(payload.id || payload._id);
    } catch {}
  }, [token]);

  async function loadDashboardData() {
    try {
      setLoading(true);
      // Load upcoming events (next 30 days)
      const eventsRes = await axios.get(`${API}/api/events?status=published&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const events = (eventsRes.data.events || []).filter((event: Event) => {
        const eventDate = new Date(event.startDate);
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      });

      setUpcomingEvents(events);

      const eventNotifications = events.slice(0, 3).map((event: Event) => ({
        id: event._id,
        type: 'event',
        title: `Upcoming: ${event.title}`,
        message: `${dayjs(event.startDate).format('MMM D')} at ${event.location?.city || 'TBD'}`,
        time: dayjs(event.startDate).fromNow(),
      }));
      // Set event notifications only
      setNotifications(eventNotifications.slice(0, 5));
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }
  const stats = {
    upcomingEvents: upcomingEvents.length,
    notifications: notifications.length,
  };

  // Open Event Details (populated) by id
  const openEventDetails = async (eventId: string) => {
    try {
      const resp = await axios.get(`${API}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedEvent(resp.data);
    } catch (e) {
      // Fallback to locally loaded list if available
      const fallback = upcomingEvents.find((e: any) => e._id === eventId) || null;
      setSelectedEvent(fallback);
    }
  };

  const openParticipantsModal = async (eventObj: any) => {
    try {
      const resp = await axios.get(`${API}/api/events/${eventObj._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParticipantsModalEvent(resp.data);
    } catch (e) {
      setParticipantsModalEvent(eventObj);
    }
    setSelectedEvent(null);
  };

  // Basic join handler: route to Discover for full join/payment flow
  const handleJoinFromDashboard = (eventId: string) => {
    if (onNavigate) onNavigate('discover');
  };

  // Message organizer fallback: create conversation then navigate home
  const handleMessageOrganizer = async (organizerId: string) => {
    if (!token) return;
    try {
      const res = await axios.post(
        `${API}/api/conversations`,
        { partnerId: organizerId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      localStorage.setItem('auralink-active-conversation', JSON.stringify(res.data));
      localStorage.setItem('auralink-in-dm', 'true');
      window.location.href = '/';
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  // View Mode Routing (booking-related routes removed)

  if (viewMode === 'allEvents') {
    return (
      <>
        <AllEvents
          token={token}
          onBack={() => setViewMode('dashboard')}
          onNavigate={onNavigate}
          onViewEvent={(id: string) => openEventDetails(id)}
        />
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onJoin={handleJoinFromDashboard}
          onMessage={handleMessageOrganizer}
          onViewParticipants={openParticipantsModal}
          currentUserId={currentUserId}
        />
        {participantsModalEvent && (
          <EventParticipantsModal
            event={participantsModalEvent}
            onClose={() => setParticipantsModalEvent(null)}
            onMessage={handleMessageOrganizer}
            onApproveRequest={async (eventId: string, requestId: string) => {
              try {
                await axios.post(
                  `${API}/api/events/${eventId}/approve-request/${requestId}`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } },
                );
                const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                setParticipantsModalEvent(refreshed.data);
              } catch (err) {
                console.error('Approve error:', err);
              }
            }}
            onRejectRequest={async (eventId: string, requestId: string) => {
              try {
                await axios.post(
                  `${API}/api/events/${eventId}/reject-request/${requestId}`,
                  {},
                  { headers: { Authorization: `Bearer ${token}` } },
                );
                const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                setParticipantsModalEvent(refreshed.data);
              } catch (err) {
                console.error('Reject error:', err);
              }
            }}
            currentUserId={currentUserId}
            isOrganizer={participantsModalEvent?.organizer?._id === currentUserId}
          />
        )}
      </>
    );
  }

  if (viewMode === 'notifications') {
    return <NotificationsPage token={token} onBack={() => setViewMode('dashboard')} />;
  }

  // If viewing a specific sport's events, show that component
  if (selectedSport) {
    return (
      <SportEvents sport={selectedSport} token={token} onBack={() => setSelectedSport(null)} />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen themed-page p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 rounded w-1/3" style={{ background: 'var(--muted)' }}></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 rounded-2xl themed-card"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-heading mb-2">
              Welcome 👋 <Sparkles className="inline w-6 h-6 text-accent align-text-bottom ml-1" />
            </h1>
            <p className="text-theme-secondary">
              Here's what's happening with your bookings and events
            </p>
          </div>
        </div>

        {/* Inline Dashboard search (single input, no overlay) */}
        <div className="rounded-2xl p-4 themed-card">
          <DashboardSearch token={token} onNavigate={onNavigate} onViewProfile={onViewProfile} />
        </div>

        {/* Stats Cards (bookings removed) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {/* All Events - Clickable */}
          <button
            onClick={() => setViewMode('allEvents')}
            className="rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 text-left group relative overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '2px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 mb-1 font-medium">
                  All Events
                </p>
                <p className="text-3xl font-bold text-heading">{stats.upcomingEvents}</p>
                <p className="text-xs text-theme-secondary mt-1">Upcoming events</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:rotate-12 transition-transform">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
          </button>

          {/* Notifications - Clickable */}
          <button
            onClick={() => setViewMode('notifications')}
            className="rounded-2xl p-6 hover:shadow-xl hover:scale-105 transition-all duration-300 text-left group relative overflow-hidden"
            style={{
              background: 'var(--card)',
              border: '2px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 dark:text-red-400 mb-1 font-medium">
                  Notifications
                </p>
                <p className="text-3xl font-bold text-heading">{stats.notifications}</p>
                <p className="text-xs text-theme-secondary mt-1">View all updates</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 ring-1 ring-accent/30 group-hover:rotate-12 transition-transform">
                <Bell className="w-6 h-6 text-white" />
              </div>
            </div>
          </button>
        </div>

        {/* Ready to Train Banner - Always at the bottom */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full -ml-24 -mb-24"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <Trophy className="w-8 h-8" />
              <h2 className="text-3xl font-bold">Ready to Train?</h2>
            </div>
            <p className="text-lg mb-6 text-white/90">
              Join events, connect with athletes, and take your fitness to the next level!
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => onNavigate && onNavigate('discover')}
                className="px-6 py-3 bg-white text-accent font-bold rounded-xl border border-accent/30 hover:border-accent/50 hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                Discover Events
              </button>
              <button
                onClick={() => setCreateEventModalOpen(true)}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white font-bold rounded-xl hover:bg-white/30 transition-all duration-300 border-2 border-white/50 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Event
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('auralink-my-activities-tab', 'services');
                  onNavigate && onNavigate('my-activities');
                }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-bold rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Service
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('auralink-my-activities-tab', 'products');
                  onNavigate && onNavigate('my-activities');
                }}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Sell Product
              </button>
              <button
                onClick={() => {
                  localStorage.setItem('auralink-discover-category', 'other');
                  onNavigate && onNavigate('discover');
                }}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Calendar className="w-5 h-5" />
                Other Events
              </button>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('auralink-all-events-filter', 'past');
                  } catch {}
                  setViewMode('allEvents');
                }}
                className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-500 text-white font-bold rounded-xl hover:from-gray-800 hover:to-gray-600 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                <Clock className="w-5 h-5" />
                Past Events
              </button>
            </div>
          </div>
        </div>

        {/* Community Events section */}
        <div className="rounded-2xl p-6 themed-card">
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-heading">Community Events</h2>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <label className="text-sm text-theme-secondary">Filter:</label>
                <select
                  value={eventsFilter}
                  onChange={(e) => setEventsFilter(e.target.value as any)}
                  className="input text-sm rounded-xl"
                >
                  <option value="all">All</option>
                  <option value="free">Free</option>
                  <option value="paid">Paid</option>
                </select>
                <button
                  onClick={() => setShowEvents((v) => !v)}
                  className="text-sm px-3 py-2 rounded-xl border-2"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                  }}
                  aria-expanded={showEvents}
                >
                  {showEvents ? 'Hide' : 'Show'}
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-end w-full sm:w-auto">
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('auralink-all-events-filter', 'past');
                    } catch {}
                    setViewMode('allEvents');
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-500 hover:from-gray-800 hover:to-gray-600 text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg"
                >
                  View Past Events
                </button>
                <button
                  onClick={() => setCreateEventModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-accent to-accentViolet-light hover:from-accent-dark hover:to-accentViolet-dark text-white text-sm font-medium rounded-xl transition-all duration-300 flex items-center gap-2 shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  Create Event
                </button>
              </div>
            </div>
          </div>

          {!showEvents ? (
            <div className="text-center py-10 text-theme-secondary">
              Events are hidden. Click "Show" to view.
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-theme-secondary mx-auto mb-3" />
              <p className="text-theme-secondary mb-4">No upcoming events</p>
              <button
                onClick={() => onNavigate && onNavigate('discover')}
                className="px-6 py-2.5 bg-gradient-to-r from-accent to-accentViolet-light hover:from-accent-dark hover:to-accentViolet-dark text-white text-sm font-medium rounded-xl transition-all duration-300 shadow-lg"
              >
                Explore Events
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingEvents
                .filter(
                  (e) => eventsFilter === 'all' || (e.pricing?.type || 'free') === eventsFilter,
                )
                .slice(0, 5)
                .map((event) => (
                  <div
                    key={event._id}
                    onClick={() => openEventDetails(event._id)}
                    className="p-4 rounded-xl themed-card hover:shadow-md transition-colors cursor-pointer relative"
                  >
                    {(() => {
                      const isArchived = !!(event as any).archivedAt;
                      const isPast = !isArchived && dayjs(event.startDate).isBefore(dayjs());
                      return (
                        (isArchived || isPast) && (
                          <div className="absolute top-3 left-3 z-10">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                              Past
                            </span>
                          </div>
                        )
                      );
                    })()}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent-light rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-lg">
                        {dayjs(event.startDate).format('DD')}
                      </div>
                      <div
                        className={`flex-1 min-w-0 ${(event as any).archivedAt || dayjs(event.startDate).isBefore(dayjs()) ? 'opacity-70' : ''}`}
                      >
                        <h3
                          className="font-semibold text-heading mb-1 line-clamp-1 break-words"
                          title={event.title}
                        >
                          {event.title}
                        </h3>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-theme-secondary">
                            <Clock className="w-4 h-4 shrink-0" />
                            <span className="truncate">
                              {dayjs(event.startDate).format('MMM D, YYYY')}
                              {event.time && ` · ${event.time}`}
                            </span>
                          </div>
                          {event.location?.city && (
                            <div className="flex items-center gap-2 text-sm text-theme-secondary">
                              <MapPin className="w-4 h-4 shrink-0" />
                              <span className="truncate">{event.location.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
        {/* End content container */}
      </div>
      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={createEventModalOpen}
        onClose={() => setCreateEventModalOpen(false)}
        token={token}
        onSuccess={() => {
          loadDashboardData();
          setCreateEventModalOpen(false);
        }}
      />
      {/* Event Detail Modal (Dashboard view) */}
      <EventDetailModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onJoin={handleJoinFromDashboard}
        onMessage={handleMessageOrganizer}
        onViewParticipants={openParticipantsModal}
        currentUserId={currentUserId}
      />
      {participantsModalEvent && (
        <EventParticipantsModal
          event={participantsModalEvent}
          onClose={() => setParticipantsModalEvent(null)}
          onMessage={handleMessageOrganizer}
          onApproveRequest={async (eventId: string, requestId: string) => {
            try {
              await axios.post(
                `${API}/api/events/${eventId}/approve-request/${requestId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
              );
              const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setParticipantsModalEvent(refreshed.data);
            } catch (err) {
              console.error('Approve error:', err);
            }
          }}
          onRejectRequest={async (eventId: string, requestId: string) => {
            try {
              await axios.post(
                `${API}/api/events/${eventId}/reject-request/${requestId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } },
              );
              const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              setParticipantsModalEvent(refreshed.data);
            } catch (err) {
              console.error('Reject error:', err);
            }
          }}
          currentUserId={currentUserId}
          isOrganizer={participantsModalEvent?.organizer?._id === currentUserId}
        />
      )}
    </div>
  );
}
