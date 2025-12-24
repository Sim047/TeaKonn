// frontend/src/components/EventDetailModal.tsx
import React, { useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Users,
  Trophy,
  Clock,
  DollarSign,
  Award,
  MessageCircle,
  User as UserIcon,
  ChevronDown,
  ChevronUp,
  XCircle,
} from 'lucide-react';
import dayjs from 'dayjs';

interface Event {
  _id: string;
  title: string;
  sport: string;
  description: string;
  startDate?: string;
  time: string;
  location: any;
  capacity?: {
    max?: number;
    current?: number;
  };
  participants: any[];
  organizer: {
    _id: string;
    username: string;
    avatar?: string;
  };
  requiresApproval: boolean;
  cost?: number;
  skillLevel?: string;
  image?: string;
  pricing?: {
    type: string;
    amount: number;
    currency: string;
    paymentInstructions?: string;
  };
  capacity?: {
    max: number;
    current: number;
  };
  archivedAt?: string;
  endsAt?: string;
}

interface EventDetailModalProps {
  event: Event | null;
  onClose: () => void;
  onJoin: (eventId: string) => void;
  onMessage: (organizerId: string) => void;
  onViewProfile?: (userId: string) => void;
  onViewParticipants?: (event: Event) => void;
  onLeave?: (eventId: string) => void;
  currentUserId?: string;
}

export default function EventDetailModal({
  event,
  onClose,
  onJoin,
  onMessage,
  onViewParticipants,
  onViewProfile,
  onLeave,
  currentUserId,
}: EventDetailModalProps) {
  if (!event) return null; // Guard against null event prop
  // Preload organizer avatar to avoid layout shift and slow renders
  React.useEffect(() => {
    try {
      const img = new Image();
      const src =
        event?.organizer?.avatar ||
        (event?.organizer?.username
          ? `https://ui-avatars.com/api/?name=${event.organizer.username}`
          : '');
      if (src) img.src = src;
    } catch {}
  }, [event?.organizer?.avatar, event?.organizer?.username]);

  const [participantsCollapsed, setParticipantsCollapsed] = useState(true);

  const isParticipant = Array.isArray(event.participants)
    ? event.participants.some((p: any) => {
        // Support various shapes: ObjectId, populated user, or { user: ObjectId }
        const pid = p?._id ?? p?.id ?? p?.user?._id ?? p?.user ?? p;
        return String(pid) === String(currentUserId);
      })
    : false;
  const isOrganizer = String(event.organizer?._id) === String(currentUserId);
  const isFull = (event.participants?.length || 0) >= (event.capacity?.max || 0);
  const isArchived = !!(event as any).archivedAt;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-cyan-500/30 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-cyan-600 to-purple-600 p-6 flex items-start justify-between z-10">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{event.title}</h2>
            <div className="flex items-center gap-3 text-cyan-100">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                {event.sport}
              </span>
              {event.skillLevel && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {event.skillLevel}
                </span>
              )}
              {isArchived && (
                <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-semibold">
                  Past Event
                </span>
              )}
              {/* Price removed: all events are free */}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Event Poster/Image */}
          {event.image && (
            <div className="rounded-xl overflow-hidden shadow-2xl border-2 border-cyan-400/30">
              <img
                src={event.image}
                alt={event.title}
                className="w-full h-96 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                onClick={() => window.open(event.image, '_blank')}
              />
              <div className="bg-gradient-to-t from-black/80 to-transparent p-4 -mt-20 relative z-10">
                <p className="text-white text-sm font-semibold">📸 Click to view full size</p>
              </div>
            </div>
          )}

          {/* Organizer Info */}
          <div className="bg-white/5 backdrop-blur rounded-xl p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div
                className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-2 transition-colors"
                onClick={() => onViewProfile && onViewProfile(event.organizer._id)}
              >
                <img
                  src={
                    event.organizer.avatar ||
                    `https://ui-avatars.com/api/?name=${event.organizer.username}`
                  }
                  alt={event.organizer.username}
                  className="w-12 h-12 rounded-full border-2 border-cyan-400"
                />
                <div>
                  <p className="text-white font-semibold hover:text-cyan-400 transition-colors">
                    {event.organizer.username}
                  </p>
                  <p className="text-gray-400 text-sm">Event Organizer · Click to view profile</p>
                </div>
              </div>
              {!isOrganizer && (
                <button
                  onClick={() => onMessage(event.organizer._id)}
                  className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-semibold transition-all shadow-lg w-full sm:w-auto mt-2 sm:mt-0"
                >
                  <MessageCircle className="w-4 h-4" />
                  Message Organizer
                </button>
              )}
            </div>
          </div>

          {/* Event Details */}
          <div className="space-y-4">
            {isArchived && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl p-3">
                This event has ended and is archived. Joining is disabled.
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-white mb-2">About This Event</h3>
              <p className="text-gray-300 leading-relaxed">{event.description}</p>
            </div>

            {/* Info Grid */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur rounded-lg p-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Calendar className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Date</p>
                    <p className="text-white font-semibold">
                      {dayjs(event.startDate || event.date).format('MMM D, YYYY')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-lg p-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="bg-cyan-500/20 p-2 rounded-lg">
                    <Clock className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Time</p>
                    <p className="text-white font-semibold">{event.time}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-lg p-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="bg-pink-500/20 p-2 rounded-lg">
                    <MapPin className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Location</p>
                    <p className="text-white font-semibold">
                      {event.location?.city ||
                        event.location?.name ||
                        event.location?.address ||
                        event.location ||
                        'Location TBA'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-lg p-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Users className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Participants</p>
                    <p className="text-white font-semibold">
                      {event.participants?.length || 0} / {event.capacity?.max || 0}
                      {isFull && <span className="text-red-400 text-xs ml-2">(Full)</span>}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Approval removed: immediate join */}

            {/* Payment instructions removed */}
          </div>

          {/* Participants Section - COLLAPSIBLE */}
          <div className="bg-gradient-to-br from-purple-900/30 to-cyan-900/30 border border-cyan-400/30 rounded-xl overflow-hidden">
            {/* Header - Always Visible */}
            <button
              onClick={() => setParticipantsCollapsed(!participantsCollapsed)}
              className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-cyan-400" />
                <div className="text-left">
                  <h3 className="text-lg font-bold text-white">Participants</h3>
                  <p className="text-gray-400 text-xs">
                    {event.participants?.length || 0} / {event.capacity?.max || 0} joined
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 text-sm font-semibold">
                  {participantsCollapsed ? 'Show' : 'Hide'}
                </span>
                {participantsCollapsed ? (
                  <ChevronDown className="w-5 h-5 text-cyan-400" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-cyan-400" />
                )}
              </div>
            </button>

            {/* Expanded Content */}
            {!participantsCollapsed && (
              <div className="p-6 pt-0 space-y-4">
                {/* Preview of Participants */}
                {event.participants?.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {event.participants.slice(0, 8).map((participant: any, idx: number) => (
                      <div
                        key={idx}
                        className="bg-white/5 backdrop-blur rounded-lg p-3 flex items-center gap-2 hover:bg-white/10 transition-colors"
                      >
                        <img
                          src={
                            participant.avatar ||
                            `https://ui-avatars.com/api/?name=${participant.username || 'User'}`
                          }
                          alt={participant.username || 'User'}
                          className="w-8 h-8 rounded-full border-2 border-cyan-400/50"
                        />
                        <span className="text-white text-sm truncate">
                          {participant.username || 'User'}
                        </span>
                      </div>
                    ))}
                    {event.participants?.length > 8 && (
                      <div className="bg-white/5 backdrop-blur rounded-lg p-3 flex items-center justify-center">
                        <span className="text-cyan-400 text-sm font-semibold">
                          +{event.participants.length - 8} more
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {event.participants?.length === 0 && !isOrganizer && (
                  <div className="text-center py-6 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No participants yet. Be the first!</p>
                  </div>
                )}

                {event.participants?.length === 0 && isOrganizer && (
                  <div className="text-center py-6 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No participants yet. Share your event!</p>
                  </div>
                )}

                {/* PROMINENT VIEW PARTICIPANTS BUTTON */}
                <button
                  onClick={() => onViewParticipants && onViewParticipants(event)}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Users className="w-5 h-5" />
                  {isOrganizer
                    ? 'Manage Participants & Requests'
                    : event.participants.length > 0
                      ? 'View All Participants'
                      : 'View Participant List'}
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!isOrganizer && (
            <div className="flex gap-3">
              {isArchived ? (
                <button
                  disabled
                  className="flex-1 py-3 rounded-lg font-semibold bg-gray-600 text-gray-400 cursor-not-allowed"
                >
                  Past Event
                </button>
              ) : isParticipant && onLeave ? (
                <button
                  onClick={() => onLeave(event._id)}
                  className="flex-1 py-3 rounded-lg font-semibold bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg inline-flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" /> Leave Event
                </button>
              ) : (
                <button
                  onClick={() => onJoin(event._id)}
                  disabled={isFull}
                  className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                    isFull
                      ? 'bg-red-600/50 text-red-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white hover:from-cyan-600 hover:to-purple-700 shadow-lg'
                  }`}
                >
                  {isFull
                    ? 'Event Full'
                    : event.requiresApproval
                      ? 'Request to Join'
                      : 'Join Event'}
                </button>
              )}
            </div>
          )}

          {isOrganizer && (
            <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border-2 border-cyan-500/50 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-cyan-400 text-lg font-bold flex items-center gap-2 mb-2">
                    <UserIcon className="w-5 h-5" />
                    You are the organizer
                  </p>
                  <p className="text-gray-300 text-sm">
                    Manage join requests, view participants, and export attendee lists from the
                    "Manage Participants" button above.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
