import React from 'react';
import Avatar from './Avatar';
import { getUserSubtitle } from '../utils/userDisplay';

export interface UserCardProps {
  user: any;
  mode: 'grid' | 'list';
  isFollowingPage?: boolean;
  userStatus?: any;
  onShowProfile: (u: any) => void;
  onOpenConversation: (opts: { partnerId: string }) => void;
  onToggleFollow: (u: any) => void;
  avatarUrl: (u: any) => string;
  compact?: boolean;
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
  compact,
}: UserCardProps) {
  const followButton = compact ? (
    <button
      onClick={() => onToggleFollow(user)}
      className={
        `p-2 rounded-xl transition-colors ${
          isFollowingPage || user.isFollowed
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
            : 'bg-green-500 text-white hover:bg-green-600'
        }`
      }
      title={isFollowingPage || user.isFollowed ? 'Unfollow' : 'Follow Back'}
    >
      <span className="sr-only">{isFollowingPage || user.isFollowed ? 'Unfollow' : 'Follow Back'}</span>
      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden="true">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2h19.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    </button>
  ) : (
    <button
      onClick={() => onToggleFollow(user)}
      className={
        mode === 'grid'
          ? `${
              'w-full px-4 py-2 rounded-md text-sm font-medium transition-colors'
            } ${
              isFollowingPage || user.isFollowed
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`
          : `${
              'flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors'
            } ${
              isFollowingPage || user.isFollowed
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600'
                : 'bg-green-500 text-white hover:bg-green-600'
            }`
      }
    >
      {isFollowingPage || user.isFollowed ? 'Unfollow' : 'Follow Back'}
    </button>
  );

  const messageButton = compact ? (
    <button
      onClick={() => onOpenConversation({ partnerId: user._id })}
      className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
      title="Message"
    >
      <span className="sr-only">Message</span>
      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
        <path d="M4 4h16v12H7l-3 3V4z" />
      </svg>
    </button>
  ) : (
    <button
      onClick={() => onOpenConversation({ partnerId: user._id })}
      className={
        mode === 'grid'
          ? 'w-full px-4 py-2 rounded-md bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-sm font-medium hover:shadow-md transition-shadow'
          : 'flex-1 sm:flex-none px-4 py-2 rounded-md bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-sm font-medium hover:shadow-md transition-shadow'
      }
    >
      Message
    </button>
  );

  if (mode === 'grid') {
    if (compact) {
      return (
        <div className="rounded-xl p-3 shadow-sm hover:shadow-lg transition-all themed-card">
          <div className="flex items-center gap-3">
            <Avatar
              src={avatarUrl(user)}
              className="w-12 h-12 rounded-lg object-cover cursor-pointer flex-shrink-0"
              onClick={() => onShowProfile(user)}
              alt={user.username}
            />
            <div className="flex items-center gap-2">
              {messageButton}
              {followButton}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold card-text truncate cursor-pointer" onClick={() => onShowProfile(user)}>
                {user.username}
              </div>
              {(() => {
                const subtitle = getUserSubtitle(user, userStatus);
                return subtitle ? (
                  <div className="text-xs card-text-muted truncate">{subtitle}</div>
                ) : null;
              })()}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl p-5 flex flex-col items-center text-center shadow-sm hover:shadow-lg transition-all min-h-[280px] themed-card">
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
            <div className="text-xs card-text-muted truncate w-full mb-4" title={subtitle}>{subtitle}</div>
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
    <div className={`${compact ? 'p-3' : 'p-4'} flex items-center gap-3 rounded-xl hover:shadow-md transition-all flex-wrap sm:flex-nowrap themed-card`}>
      <Avatar
        src={avatarUrl(user)}
        className={`${compact ? 'w-12 h-12' : 'w-14 h-14'} rounded-lg object-cover cursor-pointer flex-shrink-0`}
        onClick={() => onShowProfile(user)}
        alt={user.username}
      />

      <div className="flex items-center gap-2">
        {messageButton}
        {followButton}
      </div>

      <div className="flex-1 cursor-pointer min-w-0" onClick={() => onShowProfile(user)}>
        <div className="font-semibold card-text truncate">{user.username}</div>
        {(() => {
          const subtitle = getUserSubtitle(user, userStatus);
          return subtitle ? (
            <div className="text-sm card-text-muted truncate" title={subtitle}>{subtitle}</div>
          ) : null;
        })()}
      </div>
    </div>
  );
}
