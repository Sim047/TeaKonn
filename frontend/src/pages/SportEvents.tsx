// frontend/src/pages/SportEvents.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Trophy,
  DollarSign,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

export default function SportEvents({ sport, token, onBack }: any) {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !sport) return;
    loadEvents();
  }, [token, sport]);

  async function loadEvents() {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/events`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { sport, status: "published", limit: 50 },
      });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Load events error:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen themed-page p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 themed-card rounded w-1/3"></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 themed-card rounded-2xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-theme-secondary hover:text-heading mb-4 transition"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-heading">
                {sport} Events
              </h1>
              <p className="text-theme-secondary">
                {events.length} {events.length === 1 ? "event" : "events"} available
              </p>
            </div>
          </div>
        </div>

        {/* Events Grid */}
        {events.length === 0 ? (
          <div className="rounded-3xl p-12 text-center themed-card">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-bold mb-2">
                No Events Found
              </h3>
              <p className="text-theme-secondary">
                There are no {sport} events scheduled at the moment.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <div
                key={event._id}
                className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 themed-card"
              >
                <div className="bg-gradient-to-r from-teal-500 to-cyan-500 p-6">
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                    {event.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-medium">
                      {event.eventType}
                    </span>
                    {event.skillLevel && event.skillLevel !== "all" && (
                      <span className="px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm">
                        {event.skillLevel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-theme-secondary line-clamp-3">
                    {event.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Calendar className="w-4 h-4 text-teal-500" />
                      <span>
                        {dayjs(event.startDate).format("MMM D, YYYY")}
                        {event.time && ` at ${event.time}`}
                      </span>
                    </div>

                    {event.location?.city && (
                      <div className="flex items-center gap-2 text-theme-secondary">
                        <MapPin className="w-4 h-4 text-teal-500" />
                        <span>
                          {event.location.city}
                          {event.location.state && `, ${event.location.state}`}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-theme-secondary">
                      <Users className="w-4 h-4 text-teal-500" />
                      <span>
                        {event.capacity?.current || 0} / {event.capacity?.max || 0} participants
                      </span>
                    </div>

                    {event.pricing?.type === "paid" && (
                      <div className="flex items-center gap-2 text-theme-secondary">
                        <DollarSign className="w-4 h-4 text-teal-500" />
                        <span>
                          {event.pricing.currency} {event.pricing.amount}
                        </span>
                      </div>
                    )}

                    {event.pricing?.type === "free" && (
                      <div className="px-3 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-lg text-center font-medium">
                        Free Event
                      </div>
                    )}
                  </div>

                  {event.organizer && (
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Organized by <span className="font-medium">{event.organizer.username}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
