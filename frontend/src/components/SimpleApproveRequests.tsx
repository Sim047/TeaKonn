// Simple Approve Requests Component
import { useState, useEffect } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AlertCircle, RefreshCw, CheckCircle, XCircle, Loader } from 'lucide-react';

dayjs.extend(relativeTime);

const API = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000';

interface SimpleBooking {
  _id: string;
  status: 'pending' | 'approved' | 'rejected';
  transactionCode: string;
  isPaid: boolean;
  user: {
    username: string;
    email: string;
    avatar?: string;
  };
  event: {
    title: string;
    startDate: string;
    pricing?: {
      amount: number;
      currency: string;
    };
  };
  createdAt: string;
}

export default function SimpleApproveRequests({ token }: { token: string }) {
  const [bookings, setBookings] = useState<SimpleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    try {
      setLoading(true);
      console.log('[SimpleApproveRequests] Loading...');
      const { data } = await axios.get(`${API}/api/bookings-simple/to-approve`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log(`[SimpleApproveRequests] Loaded ${data.bookings.length} requests`);
      setBookings(data.bookings);
    } catch (err: any) {
      console.error('[SimpleApproveRequests] Error:', err);
      setError(err.response?.data?.error || 'Failed to load');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDecision(bookingId: string, approved: boolean) {
    try {
      setProcessing(bookingId);
      const rejectionReason = approved ? '' : prompt('Reason for rejection (optional):') || '';

      await axios.post(
        `${API}/api/bookings-simple/${bookingId}/decide`,
        { approved, rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert(approved ? '✅ Request approved!' : '❌ Request rejected');
      loadRequests(); // Reload
    } catch (err: any) {
      console.error('Decision error:', err);
      alert(err.response?.data?.error || 'Failed to process request');
    } finally {
      setProcessing(null);
    }
  }

  async function handleVerifyPayment(bookingId: string) {
    try {
      setProcessing(bookingId);
      await axios.post(
        `${API}/api/bookings-simple/${bookingId}/verify-payment`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      alert('💰 Payment verified!');
      loadRequests();
    } catch (err: any) {
      console.error('Verify error:', err);
      alert(err.response?.data?.error || 'Failed to verify payment');
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl p-6 themed-card">
        <div className="flex items-center justify-center py-8">
          <Loader className="w-8 h-8 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 rounded-2xl p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-800 dark:text-green-300 font-medium">
            All caught up - no requests to approve ✓
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 themed-card">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            Requests to Approve
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {bookings.length} request{bookings.length !== 1 ? 's' : ''} waiting
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

      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking._id}
            className="p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/10 dark:to-yellow-900/10 border border-orange-200 dark:border-orange-800 rounded-xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {booking.user.avatar ? (
                    <img
                      src={booking.user.avatar}
                      alt={booking.user.username}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
                      {booking.user.username[0].toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {booking.user.username}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {booking.user.status ||
                        (booking.user.username ? `@${booking.user.username}` : '')}
                    </p>
                  </div>
                </div>

                <div className="ml-13 space-y-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {booking.event?.title || ''}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    📅 {dayjs(booking.event.startDate).format('MMM D, YYYY')}
                  </p>
                  {booking.event.pricing && booking.event.pricing.amount > 0 && (
                    <p className="text-sm font-medium text-teal-600 dark:text-teal-400">
                      💰 ${booking.event.pricing.amount} {booking.event.pricing.currency}
                    </p>
                  )}
                  {booking.transactionCode && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        Transaction Code:
                      </p>
                      <p className="text-sm font-mono text-teal-600 dark:text-teal-400">
                        {booking.transactionCode}
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    Requested {dayjs(booking.createdAt).fromNow()}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {booking.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleDecision(booking._id, true)}
                      disabled={processing === booking._id}
                      className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecision(booking._id, false)}
                      disabled={processing === booking._id}
                      className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 disabled:opacity-50 text-white font-medium rounded-lg transition-all flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </>
                )}

                {booking.status === 'approved' &&
                  !booking.isPaid &&
                  booking.event.pricing &&
                  booking.event.pricing.amount > 0 && (
                    <button
                      onClick={() => handleVerifyPayment(booking._id)}
                      disabled={processing === booking._id}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 disabled:opacity-50 text-white font-medium rounded-lg transition-all"
                    >
                      Verify Payment
                    </button>
                  )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
