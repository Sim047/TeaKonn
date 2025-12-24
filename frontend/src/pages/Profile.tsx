// src/pages/Profile.tsx
import React, { useEffect, useState } from 'react';
import { API_URL } from '../config/api';
import api from '../api';

type ProfileProps = {
  userId: string;
  token?: string | null;
  onBack: () => void;
  onMessage: (targetUser: any) => void;
};

type ProfileData = {
  _id: string;
  username: string;
  email?: string;
  avatar?: string | null;
  followersCount?: number;
  followingCount?: number;
  createdAt?: string | null;
};

export default function Profile({ userId, onBack, onMessage }: ProfileProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (!userId) {
      setProfile(null);
      setLoading(false);
      setError('No user id');
      return;
    }

    setLoading(true);
    setError(null);

    api
      .get(`/users/${userId}`)
      .then((res) => {
        if (!mounted) return;
        if (res.data && typeof res.data === 'object') {
          setProfile(res.data);
        } else {
          console.error('Invalid profile response:', res.data);
          setProfile(null);
          setError('Invalid response from server');
        }
      })
      .catch((err) => {
        console.error('Profile load error:', err);
        setProfile(null);
        setError('Failed to load profile');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) return <div className="p-6">Loading profile…</div>;

  if (error)
    return (
      <div className="p-6">
        <button className="mb-4 text-sm underline" onClick={onBack}>
          ← Back
        </button>
        <div className="text-red-600">{error}</div>
      </div>
    );

  if (!profile)
    return (
      <div className="p-6">
        <button className="mb-4 text-sm underline" onClick={onBack}>
          ← Back
        </button>
        <div className="text-gray-700">Profile not available.</div>
      </div>
    );

  // Resolve avatar url safely (backend may return "/uploads/xxx" or "uploads/xxx" or full url)
  const BASE = API_URL.replace(/\/api$/, '');
  function avatarUrl(a?: string | null) {
    if (!a) return '/default-avatar.png';
    if (a.startsWith('http://') || a.startsWith('https://')) return a;
    if (a.startsWith('/')) return BASE + a;
    return BASE + '/uploads/' + a;
  }

  return (
    <div className="p-6 max-w-xl">
      <button className="mb-4 text-sm underline" onClick={onBack}>
        ← Back
      </button>

      <div className="flex items-center gap-4">
        <img
          src={avatarUrl(profile.avatar)}
          alt={profile.username}
          className="w-20 h-20 rounded-md object-cover border"
        />
        <div>
          <h2 className="text-xl font-bold">{profile.username}</h2>
        </div>
      </div>

      <div className="flex gap-8 mt-6">
        <div>
          <div className="text-2xl font-bold">{profile.followersCount ?? 0}</div>
          <div className="text-sm opacity-70">Followers</div>
        </div>

        <div>
          <div className="text-2xl font-bold">{profile.followingCount ?? 0}</div>
          <div className="text-sm opacity-70">Following</div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          className="btn px-4"
          onClick={() => {
            onMessage(profile);
          }}
        >
          Message
        </button>

        <button
          className="px-3 py-2 border rounded-md"
          onClick={() => {
            // optimistic client-side follow/unfollow could be implemented here.
            alert('Follow/unfollow not implemented in UI — use backend endpoints if needed.');
          }}
        >
          Follow
        </button>
      </div>
    </div>
  );
}
