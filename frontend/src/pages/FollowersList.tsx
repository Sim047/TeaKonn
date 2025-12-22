import React, { useEffect, useState } from "react";
import axios from "axios";
import UserCard from "../components/UserCard";

const API = import.meta.env.VITE_API_URL || "";

export default function FollowersList({
  token,
  currentUserId,
  onShowProfile,
  onOpenConversation,
}: any) {
  const [followers, setFollowers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listMode, setListMode] = useState<"grid" | "list">("grid");
  const [statuses, setStatuses] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!token || !currentUserId) return;
    axios
      .get(`${API}/api/users/${currentUserId}`, {
        headers: { Authorization: "Bearer " + token },
      })
      .then((res) => setFollowers(res.data.followers || []))
      .finally(() => setLoading(false));
  }, [token, currentUserId]);

  // Load user statuses to harmonize with All Users page
  useEffect(() => {
    if (!token) return;
    axios
      .get(`${API}/api/status`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const map: Record<string, any> = {};
        (res.data || []).forEach((s: any) => {
          if (s?.userId) map[String(s.userId)] = s;
        });
        setStatuses(map);
      })
      .catch(() => setStatuses({}));
  }, [token]);

  function avatarUrl(u: any) {
    if (!u?.avatar) return "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff";
    if (u.avatar.startsWith("http")) return u.avatar;
    if (u.avatar.startsWith("/")) return API + u.avatar;
    return API + "/uploads/" + u.avatar;
  }

  async function toggleFollow(u: any) {
    const route = u.isFollowed ? "unfollow" : "follow";

    await axios.post(
      `${API}/api/users/${u._id}/${route}`,
      {},
      { headers: { Authorization: "Bearer " + token } }
    );

    setFollowers((prev) =>
      prev.map((x) =>
        x._id === u._id ? { ...x, isFollowed: !u.isFollowed } : x
      )
    );
  }

  return (
    <div className="themed-page p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-heading flex items-center gap-2">
          <span>Followers</span>
          <span className="badge">{followers.length}</span>
        </h2>
        
        <select
          value={listMode}
          onChange={(e) => setListMode(e.target.value as any)}
          className="px-4 py-2 rounded-md border bg-white text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="grid">Grid</option>
          <option value="list">List</option>
        </select>
      </div>

      {loading ? (
        <div className="text-theme-secondary">Loading…</div>
      ) : followers.length === 0 ? (
        <div className="text-theme-secondary text-center py-12">
          <div className="text-4xl mb-3">👥</div>
          <div>No followers yet.</div>
        </div>
      ) : listMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {followers.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              mode="grid"
              isFollowingPage={false}
              userStatus={statuses[String(u._id)]}
              onShowProfile={onShowProfile}
              onOpenConversation={onOpenConversation}
              onToggleFollow={toggleFollow}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {followers.map((u) => (
            <UserCard
              key={u._id}
              user={u}
              mode="list"
              isFollowingPage={false}
              userStatus={statuses[String(u._id)]}
              onShowProfile={onShowProfile}
              onOpenConversation={onOpenConversation}
              onToggleFollow={toggleFollow}
              avatarUrl={avatarUrl}
            />
          ))}
        </div>
      )}
    </div>
  );
}
