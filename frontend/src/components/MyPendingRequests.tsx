import { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Calendar, Clock, MapPin, RefreshCw, CheckCircle, XCircle, AlertCircle, Loader } from "lucide-react";

dayjs.extend(relativeTime);

const API = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

// Simple component showing MY pending requests (bookings I created)

interface Booking {
  _id: string;
  provider: {
    _id: string;
    username: string;
    email: string;
    avatar?: string;
  };
  event?: {
    _id: string;
    title: string;
  };
  status: string;
  approvalStatus: string;
  paymentVerified: boolean;
  scheduledDate: string;
  scheduledTime: string;
  pricing: {
    amount: number;
    currency: string;
    transactionCode?: string;
  };
  rejectionReason?: string;
  createdAt: string;
}

export default function MyPendingRequests() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");
      console.log("[MyPendingRequests] Loading bookings as client...");
      
      // Use my-bookings endpoint which only returns bookings where I'm the client
      const { data } = await axios.get<{ bookings: Booking[] }>(`${API}/api/bookings/my-bookings?limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log(`[MyPendingRequests] Loaded ${data.bookings.length} bookings`);
      setBookings(data.bookings || []);
    } catch (err: any) {
      console.error("[MyPendingRequests] Load error:", err);
      setError(err.response?.data?.error || "Failed to load your requests");
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  function getStatusBadge(booking: Booking) {
    if (booking.approvalStatus === "rejected") {
      return (
        <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
          <XCircle className="w-4 h-4" />
          <span className="font-medium">Rejected</span>
        </div>
      );
    }
    
    if (booking.approvalStatus === "pending") {
      return (
        <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Pending Approval</span>
        </div>
      );
    }
    
    if (booking.approvalStatus === "approved") {
      if (booking.pricing.amount === 0) {
        return (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Confirmed</span>
          </div>
        );
      }
      
      if (booking.paymentVerified) {
        return (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="font-medium">Confirmed</span>
          </div>
        );
      }
      
      return (
        <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
          <AlertCircle className="w-4 h-4" />
          <span className="font-medium">Awaiting Payment Verification</span>
        </div>
      );
    }
    
    return null;
  }

  if (loading) {
    return (
      <div className="rounded-2xl shadow-lg p-6 themed-card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl shadow-lg p-6 themed-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            My Pending Requests
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {bookings.length} request{bookings.length !== 1 ? "s" : ""} sent to others
          </p>
        </div>
        <button
          onClick={loadBookings}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          <button onClick={loadBookings} className="text-xs text-red-500 underline mt-1">Try again</button>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">No pending requests</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Join an event to create a booking request
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <div
              key={booking._id}
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-200 dark:border-blue-800 rounded-xl hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {booking.event?.title || booking.service?.name || "Booking"}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Provider: {booking.provider.username}
                  </p>
                </div>
                {getStatusBadge(booking)}
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {dayjs(booking.scheduledDate).format("MMM D, YYYY")}
                </span>
                {booking.scheduledTime && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {booking.scheduledTime}
                  </span>
                )}
                {booking.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {booking.location}
                  </span>
                )}
                {/* Pricing removed: events are free */}
              </div>

              {/* Transaction code removed */}

              {booking.rejectionReason && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">Rejection Reason:</p>
                  <p className="text-sm text-red-600 dark:text-red-400">{booking.rejectionReason}</p>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Booked {dayjs(booking.createdAt).fromNow()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
