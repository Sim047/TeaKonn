// Simple My Requests Component
import { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Clock, RefreshCw, CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";

dayjs.extend(relativeTime);

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

interface SimpleBooking {
  _id: string;
  status: "pending" | "approved" | "rejected";
  transactionCode: string;
  isPaid: boolean;
  rejectionReason: string;
  event: {
    _id: string;
    title: string;
    startDate: string;
    location?: { name: string };
    organizer: {
      username: string;
      avatar?: string;
    };
    pricing?: {
      amount: number;
      currency: string;
    };
  };
  createdAt: string;
}

export default function SimpleMyRequests() {
  const [bookings, setBookings] = useState<SimpleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = localStorage.getItem("token");

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      console.log("[SimpleMyRequests] Loading...");
      const { data } = await axios.get(`${API}/api/bookings-simple/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[SimpleMyRequests] Loaded ${data.bookings.length} requests`);
      setBookings(data.bookings);
    } catch (err: any) {
      console.error("[SimpleMyRequests] Error:", err);
      setError(err.response?.data?.error || "Failed to load");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(booking: SimpleBooking) {
    if (booking.status === "approved") {
      return (
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span className="font-medium">Approved ✓</span>
        </div>
      );
    }
    if (booking.status === "rejected") {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <XCircle className="w-4 h-4" />
          <span className="font-medium">Rejected</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
        <AlertCircle className="w-4 h-4" />
        <span className="font-medium">Pending...</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 themed-card">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 themed-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            My Join Requests
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {bookings.length} request{bookings.length !== 1 ? "s" : ""} sent
          </p>
        </div>
        <button
          onClick={loadRequests}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No join requests yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking._id}
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-xl"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {booking.event?.title || ''}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Organizer: {booking.event.organizer.username}
                  </p>
                </div>
                {getStatusBadge(booking)}
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>📅 {dayjs(booking.event.startDate).format("MMM D, YYYY")}</p>
                {booking.event.location && <p>📍 {booking.event.location.name}</p>}
                {booking.event.pricing && booking.event.pricing.amount > 0 && (
                  <p>💰 ${booking.event.pricing.amount} {booking.event.pricing.currency}</p>
                )}
              </div>

              {booking.rejectionReason && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Reason: {booking.rejectionReason}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Requested {dayjs(booking.createdAt).fromNow()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
