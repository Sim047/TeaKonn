import React from "react";
import Avatar from "./Avatar";
import { getUserSubtitle } from "../utils/userDisplay";

export interface UserCardProps {
  user: any;
  mode: "grid" | "list";
  isFollowingPage?: boolean;
  userStatus?: any;
  onShowProfile: (u: any) => void;
  onOpenConversation: (opts: { partnerId: string }) => void;
  onToggleFollow: (u: any) => void;
  avatarUrl: (u: any) => string;
}

export default function UserCard({
  user,
  mode,
  isFollowingPage,
  userStatus,
  onShowProfile,
  onOpenConversation,
  onToggleFollow,
  avatarUrl,
}: UserCardProps) {
  const followButton = (
    <button
      onClick={() => onToggleFollow(user)}
      className={
        mode === "grid"
          ? `${
              /* grid button */
            "w-full px-4 py-2 rounded-md text-sm font-medium transition-colors"
            } ${
              isFollowingPage || user.isFollowed
                ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`
          : `${
              /* list button */
            "flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors"
            } ${
              isFollowingPage || user.isFollowed
                ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
                : "bg-green-500 text-white hover:bg-green-600"
            }`
      }
    >
      {isFollowingPage || user.isFollowed ? "Unfollow" : "Follow Back"}
    </button>
  );

  const messageButton = (
    <button
      onClick={() => onOpenConversation({ partnerId: user._id })}
      className={
        mode === "grid"
          ? "w-full px-4 py-2 rounded-md bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-sm font-medium hover:shadow-md transition-shadow"
          : "flex-1 sm:flex-none px-4 py-2 rounded-md bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-sm font-medium hover:shadow-md transition-shadow"
      }
    >
      Message
    </button>
  );

  if (mode === "grid") {
    return (
      <div
        className="rounded-xl p-5 flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all min-h-[280px] themed-card"
      >
        <Avatar
          src={avatarUrl(user)}
          className="w-20 h-20 rounded-lg object-cover cursor-pointer mb-3 flex-shrink-0"
          onClick={() => onShowProfile(user)}
          alt={user.username}
        />

        <div
          className="mt-1 font-semibold cursor-pointer truncate w-full card-text"
          onClick={() => onShowProfile(user)}
        >
          {user.username}
        </div>

        {(() => {
          const subtitle = getUserSubtitle(user, userStatus);
          return subtitle ? (
            <div className="text-xs card-text-muted truncate w-full mb-4">{subtitle}</div>
          ) : (
            <div className="mb-4" />
          );
        })()}

        <div className="flex flex-col gap-2 mt-auto w-full">
          {messageButton}
          {followButton}
        </div>
      </div>
    );
  }

  // list mode
  return (
    <div className="flex items-center gap-3 p-4 rounded-xl hover:shadow-md transition-all flex-wrap sm:flex-nowrap themed-card">
      <Avatar
        src={avatarUrl(user)}
        className="w-14 h-14 rounded-lg object-cover cursor-pointer flex-shrink-0"
        onClick={() => onShowProfile(user)}
        alt={user.username}
      />

      <div className="flex-1 cursor-pointer min-w-0" onClick={() => onShowProfile(user)}>
        <div className="font-semibold card-text truncate">{user.username}</div>
        {(() => {
          const subtitle = getUserSubtitle(user, userStatus);
          return subtitle ? (
            <div className="text-sm card-text-muted truncate">{subtitle}</div>
          ) : null;
        })()}
      </div>

      <div className="flex gap-2 w-full sm:w-auto">
        {messageButton}
        {followButton}
      </div>
    </div>
  );
}
