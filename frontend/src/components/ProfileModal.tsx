// frontend/src/components/ProfileModal.tsx
import React from "react";
import { X, MessageCircle, UserPlus, UserMinus } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

export default function ProfileModal({
  user,
  onClose,
  onMessage,
  onFollowToggle,
}: any) {
  if (!user) return null;

  function avatarUrl(u: any) {
    if (!u?.avatar) return "https://placehold.co/120x120?text=User";
    if (u.avatar.startsWith("http")) return u.avatar;
    if (u.avatar.startsWith("/")) return API + u.avatar;
    return API + "/uploads/" + u.avatar;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-md overflow-hidden border border-cyan-500/30 shadow-2xl">
        
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-cyan-600 to-purple-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <img
            src={avatarUrl(user)}
            className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white/20 shadow-xl"
            alt={user.username}
          />
          <h2 className="mt-4 text-2xl font-bold text-white">{user.username}</h2>
          <p className="text-cyan-100 text-sm mt-1">
            {user.status || (user.username ? `@${user.username}` : '')}
          </p>
        </div>

        {/* Stats & Actions Section */}
        <div className="p-6 space-y-6">
          {/* FOLLOWERS & FOLLOWING */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onFollowToggle("followers", user)}
              className="bg-white/5 backdrop-blur rounded-xl p-4 text-center hover:bg-white/10 transition-all"
            >
              <div className="text-3xl font-bold text-cyan-400">
                {user.followers?.length || 0}
              </div>
              <div className="text-gray-400 text-sm mt-1">Followers</div>
            </button>

            <button
              onClick={() => onFollowToggle("following", user)}
              className="bg-white/5 backdrop-blur rounded-xl p-4 text-center hover:bg-white/10 transition-all"
            >
              <div className="text-3xl font-bold text-purple-400">
                {user.following?.length || 0}
              </div>
              <div className="text-gray-400 text-sm mt-1">Following</div>
            </button>
          </div>

          {/* Action Buttons */}
          {user.isSelf ? (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
              <p className="text-cyan-400 text-sm">This is your profile</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* FOLLOW / UNFOLLOW */}
              <button
                onClick={() => onFollowToggle("toggle")}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                  user.isFollowing
                    ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                    : "bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
                }`}
              >
                {user.isFollowing ? (
                  <>
                    <UserMinus className="w-5 h-5" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    Follow
                  </>
                )}
              </button>

              {/* MESSAGE BUTTON */}
              <button
                onClick={() => onMessage(user)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Message
              </button>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-gray-400 hover:text-white transition-colors py-2"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
