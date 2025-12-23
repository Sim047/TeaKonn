// Notifications Page - View all notifications
import { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Bell, ArrowLeft, Calendar, Loader } from "lucide-react";

dayjs.extend(relativeTime);

import { API_URL } from "../config/api";
const API = API_URL.replace(/\/api$/, "");

export default function Notifications({ token, onBack }: any) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      // Load events to generate notifications (bookings removed)
      const eventsRes = await axios.get(`${API}/api/events?status=published&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const events = (eventsRes.data.events || []).filter((event: any) => {
        const eventDate = new Date(event.startDate);
        const now = new Date();
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(now.getDate() + 30);
        return eventDate >= now && eventDate <= thirtyDaysFromNow;
      });

      const eventNotifications = events.map((event: any) => ({
        id: event._id,
        type: 'event',
        title: `Upcoming: ${event.title}`,
        message: `${dayjs(event.startDate).format('MMM D')} at ${event.location?.city || 'TBD'}`,
        time: dayjs(event.startDate).fromNow(),
        date: event.startDate,
      }));
      const allNotifications = [...eventNotifications]
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setNotifications(allNotifications);
    } catch (err) {
      console.error("Load notifications error:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
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
              <h1 className="text-3xl font-bold mb-2">
                Notifications
              </h1>
              <p className="text-theme-secondary">Stay updated with upcoming events</p>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl p-12 text-center themed-card">
            <Bell className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">
              No notifications
            </h3>
            <p className="text-theme-secondary">
              You're all caught up! Check back later for updates.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className="rounded-2xl p-6 hover:shadow-lg transition-all duration-300 group themed-card"
              >
                <div className="flex items-start gap-4">
                  <div className={"w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-purple-100 dark:bg-purple-900/30"}>
                    <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-heading mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {notif.title}
                    </h3>
                    <p className="text-theme-secondary mb-2">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={"px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"}>
                        Event
                      </span>
                      <span className="text-xs text-theme-secondary">
                        {notif.time}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
