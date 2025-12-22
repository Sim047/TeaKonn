import React, { useState } from "react";
import api from "../utils/axios";

type Props = {
  targetUserId: string;
  initialFollowing: boolean;
  initialFollowers: number;
  onChange?: (following: boolean, followersCount: number) => void;
};

export default function FollowButton({ targetUserId, initialFollowing, initialFollowers, onChange }: Props) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [followers, setFollowers] = useState(initialFollowers);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const url = `/users/${targetUserId}/${isFollowing ? 'unfollow' : 'follow'}`;
      const res = await api.post(url);
      const newFollowers = typeof res.data.followersCount === 'number' ? res.data.followersCount : (isFollowing ? followers - 1 : followers + 1);
      setIsFollowing(!isFollowing);
      setFollowers(newFollowers);
      onChange?.(!isFollowing, newFollowers);
    } catch (err) {
      console.error('follow toggle error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <button onClick={toggle} disabled={loading} className={`px-4 py-1 rounded-full text-sm font-medium border ${isFollowing ? 'bg-white text-gray-700 border-gray-300' : 'bg-blue-600 text-white'}`}>
        {loading ? '...' : isFollowing ? 'Following' : 'Follow'}
      </button>
      <div className="text-sm text-gray-600"><strong>{followers}</strong> followers</div>
    </div>
  );
}
