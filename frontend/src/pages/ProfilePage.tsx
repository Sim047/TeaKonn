import React from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  user: any;
  isOpen: boolean;
  onClose: () => void;
  isFollowed: boolean;
  onFollow: () => void;
  onUnfollow: () => void;
  onMessage: () => void;
}

export default function ProfileModal({
  user,
  isOpen,
  onClose,
  isFollowed,
  onFollow,
  onUnfollow,
  onMessage,
}: Props) {
  if (!isOpen || !user) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.85, opacity: 0 }}
          transition={{ type: "spring", stiffness: 140, damping: 14 }}
          className="shadow-xl w-[380px] rounded-xl p-7 themed-card"
        >
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <img
              src={user.avatar || "/default.png"}
              className="w-24 h-24 rounded-xl object-cover shadow border"
              style={{ borderColor: 'var(--border)' }}
            />
            <h2 className="mt-4 text-xl font-semibold text-heading">{user.username}</h2>
          </div>

          {/* Followers / Following */}
          <div className="flex justify-center gap-10 mt-6">
            <div className="text-center">
              <p className="text-xl font-bold text-heading">{user.followersCount}</p>
              <p className="text-xs text-theme-secondary">Followers</p>
            </div>

            <div className="text-center">
              <p className="text-xl font-bold text-heading">{user.followingCount}</p>
              <p className="text-xs text-theme-secondary">Following</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={onMessage}
              className="btn"
            >
              Message
            </button>

            {isFollowed ? (
              <button
                onClick={onUnfollow}
                className="themed-card"
              >
                Unfollow
              </button>
            ) : (
              <button
                onClick={onFollow}
                className="px-5 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
              >
                Follow
              </button>
            )}
          </div>

          {/* Close */}
          <div className="mt-5 text-center">
            <button
              className="text-xs text-theme-secondary hover:opacity-100"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
