// Pending Approvals - Dedicated Page
import { useState, useEffect } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { 
  import { ArrowLeft } from "lucide-react";
  import { useState } from "react";

  export default function PendingApprovals({ onBack }: any) {
    const [_, __] = useState(null); // placeholder to ensure component compiles
    return (
      <div className="min-h-screen themed-page">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-theme-secondary hover:text-heading mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div className="rounded-2xl p-8 themed-card text-center">
            <h1 className="text-2xl font-bold text-heading mb-2">Pending Approvals Retired</h1>
            <p className="text-theme-secondary">
              The booking system has been removed. This page is no longer available.
            </p>
          </div>
        </div>
      </div>
    );
  }
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
              <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text)' }}>
                Pending Approvals
              </h1>
              <p className="text-theme-secondary">
                Review and approve join requests for your events
              </p>
            </div>
            
            <button
              onClick={loadRequests}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-6 border border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 dark:text-orange-400 mb-1">Pending Approval</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-300">{pendingBookings.length}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-orange-400 dark:text-orange-600" />
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 dark:text-blue-400 mb-1">Awaiting Payment</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{approvedUnpaid.length}</p>
              </div>
              <ShieldCheck className="w-12 h-12 text-blue-400 dark:text-blue-600" />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400">
            {error}
          </div>
        ) : pendingBookings.length === 0 && approvedUnpaid.length === 0 ? (
          <div className="rounded-2xl p-12 text-center themed-card">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-heading mb-2">
              All caught up!
            </h3>
            <p className="text-theme-secondary">
              No pending approvals or payments to verify
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Pending Approvals */}
            {pendingBookings.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-heading mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  Pending Approval ({pendingBookings.length})
                </h2>
                <div className="grid gap-4">
                  {pendingBookings.map((booking) => (
                    <div
                      key={booking._id}
                      className="rounded-2xl border-2 border-orange-200 dark:border-orange-800 p-6 hover:shadow-xl transition-all duration-300 themed-card"
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          {/* User Info */}
                          <div className="flex items-center gap-3">
                            <div 
                              onClick={() => onNavigate && onNavigate('profile', booking.user._id)}
                              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg cursor-pointer hover:scale-110 transition-transform"
                            >
                              {booking.user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p 
                                onClick={() => onNavigate && onNavigate('profile', booking.user._id)}
                                className="font-bold text-heading cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              >
                                {booking.user.username}
                              </p>
                              <p className="text-sm text-theme-secondary">{booking.user.status || (booking.user.username ? `@${booking.user.username}` : '')}</p>
                            </div>
                          </div>

                          {/* Event Details */}
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold text-heading">
                              {booking.event?.title || ''}
                            </h3>
                            
                            <div className="flex flex-wrap gap-4 text-sm text-theme-secondary">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                {dayjs(booking.event.startDate).format("MMM D, YYYY")}
                              </div>
                              
                              {booking.event.pricing && booking.event.pricing.amount > 0 && (
                                <div className="flex items-center gap-2">
                                  <DollarSign className="w-4 h-4 text-green-500" />
                                  <span className="font-semibold">
                                    {booking.event.pricing.currency} {booking.event.pricing.amount}
                                  </span>
                                </div>
                              )}
                            </div>

                            {booking.transactionCode && (
                              <div className="flex items-center gap-2 text-sm themed-card p-2">
                                <FileText className="w-4 h-4 text-theme-secondary" />
                                <span className="text-theme-secondary">
                                  Transaction: <span className="font-mono font-semibold">{booking.transactionCode}</span>
                                </span>
                              </div>
                            )}

                            <p className="text-xs text-theme-secondary">
                              Requested {dayjs(booking.createdAt).fromNow()}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex md:flex-col gap-3">
                          <button
                            onClick={() => handleApprove(booking._id)}
                            disabled={processing === booking._id}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                          >
                            {processing === booking._id ? (
                              <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                              <CheckSquare className="w-4 h-4" />
                            )}
                            Approve
                          </button>
                          
                          <button
                            onClick={() => setShowRejectionModal(booking._id)}
                            disabled={processing === booking._id}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Awaiting Payment Verification */}
            {approvedUnpaid.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-heading mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  Awaiting Payment Verification ({approvedUnpaid.length})
                </h2>
                <div className="grid gap-4">
                  {approvedUnpaid.map((booking) => (
                    <div
                      key={booking._id}
                      className="rounded-2xl border-2 border-blue-200 dark:border-blue-800 p-6 themed-card"
                    >
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2">
                          <p className="font-bold text-heading">{booking.user.username}</p>
                          <p className="text-sm text-theme-secondary">{booking.event.title}</p>
                          {booking.transactionCode && (
                            <p className="text-sm font-mono themed-card px-2 py-1 rounded">
                              {booking.transactionCode}
                            </p>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handleVerifyPayment(booking._id)}
                          disabled={processing === booking._id}
                          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all disabled:opacity-50 shadow-lg"
                        >
                          {processing === booking._id ? (
                            <Loader className="w-4 h-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="w-4 h-4" />
                          )}
                          Verify Payment
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="rounded-2xl p-6 max-w-md w-full themed-card">
            <h3 className="text-xl font-bold text-heading mb-4">
              Reject Join Request
            </h3>
            <p className="text-sm text-theme-secondary mb-4">
              Please provide a reason for rejecting this request:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., Event is full, Requirements not met..."
              className="input w-full rounded-xl mb-4 resize-none"
              rows={4}
              maxLength={200}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectionModal(null);
                  setRejectionReason("");
                }}
                className="flex-1 px-4 py-2 rounded-xl themed-card hover:opacity-90 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectionModal)}
                disabled={!rejectionReason.trim() || processing === showRejectionModal}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing === showRejectionModal ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
