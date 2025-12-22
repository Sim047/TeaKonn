// frontend/src/components/JoinRequestsManager.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { CheckCircle, XCircle, Calendar, User, CreditCard, Clock } from "lucide-react";

dayjs.extend(relativeTime);

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

interface JoinRequest {
  requestId: string;
  event: {
    _id: string;
    title: string;
    startDate: string;
    pricing: any;
  };
  user: {
    _id: string;
    username: string;
    avatar?: string;
    email?: string;
  };
  transactionCode: string;
  requestedAt: string;
}

export default function JoinRequestsManager({ token }: { token: string }) {
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("JoinRequestsManager component mounted, token:", !!token);
    loadRequests();
  }, [token]);

  async function loadRequests() {
    if (!token) return;
    
    try {
      setLoading(true);
      console.log("JoinRequestsManager: Fetching event requests...");
      const res = await axios.get(`${API}/api/events/my-events-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("JoinRequestsManager: Received data:", res.data);
      setRequests(Array.isArray(res.data) ? res.data : []);
    } catch (err: any) {
      console.error("Error loading join requests:", err);
      // Silently fail - just show no requests
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(eventId: string, requestId: string) {
    try {
      await axios.post(
        `${API}/api/events/${eventId}/approve-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Join request approved!");
      loadRequests();
    } catch (err: any) {
      console.error("Approve error:", err);
      alert(err.response?.data?.error || "Failed to approve request");
    }
  }

  async function handleReject(eventId: string, requestId: string) {
    try {
      await axios.post(
        `${API}/api/events/${eventId}/reject-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert("Join request rejected");
      loadRequests();
    } catch (err: any) {
      console.error("Reject error:", err);
      alert(err.response?.data?.error || "Failed to reject request");
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
        <p className="text-slate-400 mt-2">Loading requests...</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return null; // Don't show section if no pending requests
  }

  return (
    <div className="rounded-3xl p-8 themed-card">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
        Events Awaiting Your Approval ({requests.length})
      </h2>

      <div className="space-y-4">
      {requests.map((req) => (
        <div
          key={req.requestId}
          className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-2xl p-5 border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{req.event.title}</h3>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                <Calendar className="w-4 h-4" />
                <span>{dayjs(req.event.startDate).format("MMM D, YYYY")}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="w-4 h-4" />
                <span>Requested {dayjs(req.requestedAt).fromNow()}</span>
              </div>
            </div>
          </div>

          <div className="rounded-lg p-4 mb-4 themed-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-bold">
                {req.user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{req.user.username}</p>
                {(req.user.status || req.user.username) && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {req.user.status || (req.user.username ? `@${req.user.username}` : '')}
                  </p>
                )}
              </div>
            </div>

            {/* Transaction code and event fee removed: all events are free */}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleReject(req.event._id, req.requestId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-600/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-600/50 rounded-lg font-medium transition-all"
            >
              <XCircle className="w-5 h-5" />
              Reject
            </button>
            <button
              onClick={() => handleApprove(req.event._id, req.requestId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg font-medium transition-all"
            >
              <CheckCircle className="w-5 h-5" />
              Approve
            </button>
          </div>
        </div>
      ))}
      </div>
    </div>
  );
}
