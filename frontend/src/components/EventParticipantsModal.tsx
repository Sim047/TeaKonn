// frontend/src/components/EventParticipantsModal.tsx
import React, { useState } from 'react';
import { X, Users, Download, MessageCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import dayjs from 'dayjs';

interface Participant {
  _id: string;
  username: string;
  avatar?: string;
  email?: string;
}

interface JoinRequest {
  _id: string;
  user: Participant;
  transactionCode?: string;
  requestedAt?: string;
  status?: string;
}

interface EventType {
  _id: string;
  title?: string;
  participants?: Participant[];
  joinRequests?: JoinRequest[];
  capacity?: { max?: number; current?: number };
  organizer?: any;
}

interface EventParticipantsModalProps {
  event: EventType | null;
  onClose: () => void;
  onMessage?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  onApproveRequest?: (eventId: string, requestId: string) => void;
  onRejectRequest?: (eventId: string, requestId: string) => void;
  currentUserId?: string;
  isOrganizer?: boolean;
}

export default function EventParticipantsModal({
  event,
  onClose,
  onMessage,
  onViewProfile,
  onApproveRequest,
  onRejectRequest,
  currentUserId,
  isOrganizer = false,
}: EventParticipantsModalProps) {
  const [activeTab, setActiveTab] = useState<'confirmed' | 'pending'>('confirmed');

  if (!event) return null;

  const confirmedCount = event.participants?.length || 0;
  const pendingRequests = event.joinRequests?.filter((req) => req.status === 'pending') || [];
  const pendingCount = pendingRequests.length;

  const exportParticipantsList = () => {
    try {
      const csvRows: string[] = [];
      csvRows.push(['Name', 'Username', 'Status'].join(','));
      (event.participants || []).forEach((p) => {
        csvRows.push([p.username || '', p.username || '', 'Confirmed'].join(','));
      });
      (pendingRequests || []).forEach((req) => {
        csvRows.push([req.user?.username || '', req.user?.username || '', 'Pending'].join(','));
      });

      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = (event.title || 'event').replace(/[^a-z0-9]/gi, '_');
      a.download = `${safeTitle}_participants.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export participants:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden border border-cyan-500/30 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-600 to-purple-600 p-6 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-1">Event Participants</h2>
            <p className="text-cyan-100">{event.title || ''}</p>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="bg-white/20 px-3 py-1 rounded-full">
                {confirmedCount} / {event.capacity?.max || '∞'} Confirmed
              </span>
              {pendingCount > 0 && (
                <span className="bg-yellow-500/30 px-3 py-1 rounded-full">
                  {pendingCount} Pending
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isOrganizer && confirmedCount > 0 && (
              <button
                onClick={exportParticipantsList}
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors"
                title="Export to CSV"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        {isOrganizer && pendingCount > 0 && (
          <div className="flex bg-gray-800/50 border-b border-white/10">
            <button
              onClick={() => setActiveTab('confirmed')}
              className={`flex-1 px-6 py-3 font-semibold transition-colors ${activeTab === 'confirmed' ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Users className="w-4 h-4 inline mr-2" /> Confirmed ({confirmedCount})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex-1 px-6 py-3 font-semibold transition-colors ${activeTab === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-white'}`}
            >
              <Clock className="w-4 h-4 inline mr-2" /> Pending Approval ({pendingCount})
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'confirmed' && (
            <div>
              {confirmedCount === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No confirmed participants yet</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {(event.participants || []).map((participant) => (
                    <div
                      key={participant._id}
                      className="bg-white/5 backdrop-blur rounded-lg p-4 hover:bg-white/10 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={
                            participant.avatar ||
                            `https://ui-avatars.com/api/?name=${participant.username}`
                          }
                          alt={participant.username}
                          className="w-12 h-12 rounded-full border-2 border-cyan-400 cursor-pointer hover:scale-110 transition-transform"
                          onClick={() => onViewProfile && onViewProfile(participant._id)}
                        />
                        <div className="flex-1">
                          <p
                            className="text-white font-semibold cursor-pointer hover:text-cyan-400 transition-colors"
                            onClick={() => onViewProfile && onViewProfile(participant._id)}
                          >
                            {participant.username}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {participant._id === currentUserId
                              ? 'You'
                              : participant._id === event.organizer?._id
                                ? 'Organizer'
                                : 'Participant'}
                          </p>
                        </div>
                        {participant._id !== currentUserId && (
                          <button
                            onClick={() => onMessage && onMessage(participant._id)}
                            className="bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 p-2 rounded-lg transition-colors"
                            title="Send message"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'pending' && isOrganizer && (
            <div>
              {pendingCount === 0 ? (
                <div className="text-center text-gray-400 py-12">
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div
                      key={request._id}
                      className="bg-white/5 backdrop-blur rounded-lg p-4 border border-yellow-500/30"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={
                            request.user?.avatar ||
                            `https://ui-avatars.com/api/?name=${request.user?.username}`
                          }
                          alt={request.user?.username}
                          className="w-12 h-12 rounded-full border-2 border-yellow-400"
                        />
                        <div className="flex-1">
                          <p className="text-white font-semibold">{request.user?.username}</p>
                          <p className="text-gray-400 text-sm mb-2">
                            Requested {dayjs(request.requestedAt).fromNow()}
                          </p>
                          {request.transactionCode &&
                            request.transactionCode !== 'FREE' &&
                            request.transactionCode !== 'N/A' && (
                              <p className="text-cyan-400 text-xs">
                                Transaction: {request.transactionCode}
                              </p>
                            )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              onApproveRequest && onApproveRequest(event._id, request._id)
                            }
                            className="bg-green-500/20 hover:bg-green-500/30 text-green-400 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() =>
                              onRejectRequest && onRejectRequest(event._id, request._id)
                            }
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
