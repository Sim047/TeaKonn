// frontend/src/pages/AllUsers.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { API_URL } from "../config/api";
import Avatar from "../components/Avatar";

const API = API_URL.replace(/\/api$/, "");
const PLACEHOLDER = "https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff";

type User = {
  _id: string;
  username?: string;
  email?: string;
  avatar?: string;
  isFollowed?: boolean;
};

export default function AllUsers({ token, onOpenConversation, currentUserId, onShowProfile }: any) {

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [listMode, setListMode] = useState<"grid" | "list">("list");

  // Image Preview Modal
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState("");
  const [previewUsername, setPreviewUsername] = useState("");

  /* ----------------------------------------------------------
     LOAD USERS
  ----------------------------------------------------------- */
  useEffect(() => {
    if (!token) return;
    loadUsers();
  }, [token]);

  async function loadUsers(q = "") {
    try {
      setLoading(true);

      const url =
        API + "/api/users/all" + (q ? "?search=" + encodeURIComponent(q) : "");

      const res = await axios.get(url, {
        headers: { Authorization: "Bearer " + token },
      });

      const normalized = (res.data || []).map((u: any) => ({
        ...(u || {}),
        isFollowed: !!u.isFollowed,
      }));

      setUsers(normalized);
    } catch (err) {
      console.error("AllUsers load err", err);
    } finally {
      setLoading(false);
    }
  }

  /* ----------------------------------------------------------
     SEARCH (debounced)
  ----------------------------------------------------------- */
  useEffect(() => {
    const t = setTimeout(() => {
      if (!token) return;
      loadUsers(search);
    }, 300);

    return () => clearTimeout(t);
  }, [search]);

  /* ----------------------------------------------------------
     UTIL: Avatar Url
  ----------------------------------------------------------- */
  function avatarUrl(u: any) {
    if (!u?.avatar) return PLACEHOLDER;
    if (u.avatar.startsWith("http")) return u.avatar;
    if (u.avatar.startsWith("/")) return API + u.avatar;
    return API + "/uploads/" + u.avatar;
  }

  /* ----------------------------------------------------------
     START CONVERSATION
  ----------------------------------------------------------- */
  async function startConversation(user: User) {
    if (!token) return;

    setProcessingId(user._id);

    try {
      const res = await axios.post(
        API + "/api/users/conversations/start",
        { partnerId: user._id },
        { headers: { Authorization: "Bearer " + token } }
      );

      onOpenConversation(res.data);
    } catch (err) {
      console.error("startConversation error", err);
      alert("Could not start chat");
    } finally {
      setProcessingId(null);
    }
  }

  /* ----------------------------------------------------------
     FOLLOW / UNFOLLOW
  ----------------------------------------------------------- */
  async function followToggle(user: User, follow: boolean) {
    if (!token) return;

    setProcessingId(user._id);

    try {
      const url = `${API}/api/users/${user._id}/${follow ? "follow" : "unfollow"}`;

      await axios.post(
        url,
        {},
        { headers: { Authorization: "Bearer " + token } }
      );

      setUsers((prev) =>
        prev.map((u) =>
          u._id === user._id ? { ...u, isFollowed: follow } : u
        )
      );
    } catch (err) {
      console.error("followToggle error", err);
    } finally {
      setProcessingId(null);
    }
  }

  /* ----------------------------------------------------------
     OPEN PROFILE
  ----------------------------------------------------------- */
  function openProfile(user: User) {
    if (onShowProfile) {
      onShowProfile(user);
    }
  }

  /* ----------------------------------------------------------
     PREVIEW IMAGE
  ----------------------------------------------------------- */
  function previewImage(user: User) {
    setPreviewImageUrl(avatarUrl(user));
    setPreviewUsername(user.username || "User");
    setImagePreviewOpen(true);
  }

  /* ==========================================================
     RENDER
  =========================================================== */

  return (
    <div className="min-h-screen p-6 themed-page">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-2xl font-bold">📋 All Users</h2>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-none">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="input w-full sm:w-64 pl-10 pr-4 py-2 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </div>

          <select
            value={listMode}
            onChange={(e) => setListMode(e.target.value as any)}
            className="input px-4 py-2 rounded-md"
          >
            <option value="grid">Grid</option>
            <option value="list">List</option>
          </select>
        </div>
      </div>

      {/* USERS */}
      {loading ? (
        <div className="text-theme-muted">Loading users…</div>
      ) : users.length === 0 ? (
        <div className="text-theme-muted text-center py-12">
          <div className="text-4xl mb-3">🔍</div>
          <div>{search ? `No users found matching "${search}"` : "No users found."}</div>
        </div>
      ) : listMode === "grid" ? (
        /* -------------------- GRID MODE -------------------- */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
          {users.map((u) => (
            <div
              key={u._id}
              className="
                rounded-xl p-3 sm:p-5 flex flex-col items-center text-center 
                shadow-sm hover:shadow-lg transition-all
                min-h-[260px] sm:min-h-[280px] themed-card
              "
            >
              {/* Avatar */}
              <div className="relative group mb-2 sm:mb-3 flex-shrink-0">
                <Avatar
                  src={avatarUrl(u)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg object-cover cursor-pointer transition-transform group-hover:scale-105"
                  onClick={() => previewImage(u)}
                  alt={u.username}
                />
                <div 
                  className="absolute inset-0 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                  onClick={() => previewImage(u)}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </div>
              </div>

              {/* Username */}
              <div
                className="mt-1 font-semibold cursor-pointer truncate w-full text-sm sm:text-base"
                onClick={() => openProfile(u)}
              >
                {u.username}
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-1.5 sm:gap-2 mt-auto w-full">
                <button
                  className="w-full px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-xs sm:text-sm font-medium hover:shadow-md transition-shadow"
                  onClick={() => startConversation(u)}
                  disabled={processingId === u._id}
                >
                  {processingId === u._id ? "..." : "Message"}
                </button>

                {u._id !== currentUserId && (
                  <button
                    className="w-full px-3 py-1.5 sm:px-4 sm:py-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                    onClick={() => followToggle(u, !u.isFollowed)}
                    disabled={processingId === u._id}
                  >
                    {u.isFollowed ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* -------------------- LIST MODE -------------------- */
        <div className="flex flex-col gap-2 sm:gap-3">
          {users.map((u) => (
            <div
              key={u._id}
              className="
                flex flex-col sm:flex-row sm:items-center sm:justify-between 
                p-3 sm:p-4 rounded-lg themed-card
                gap-3
              "
            >
              <div className="flex items-center gap-3">
                <div className="relative group flex-shrink-0">
                  <Avatar
                    src={avatarUrl(u)}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-md object-cover cursor-pointer transition-transform group-hover:scale-105"
                    onClick={() => previewImage(u)}
                    alt={u.username}
                  />
                  <div 
                    className="absolute inset-0 bg-black/40 rounded-md opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                    onClick={() => previewImage(u)}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold cursor-pointer truncate"
                    onClick={() => openProfile(u)}
                  >
                    {u.username}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  className="flex-1 sm:flex-none px-4 py-2 rounded-md bg-gradient-to-r from-cyan-400 to-purple-500 text-white text-sm font-medium hover:shadow-md transition-shadow disabled:opacity-50"
                  onClick={() => startConversation(u)}
                  disabled={processingId === u._id}
                >
                  {processingId === u._id ? "..." : "Message"}
                </button>

                {u._id !== currentUserId && (
                  <button
                    className="flex-1 sm:flex-none px-4 py-2 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100 text-sm font-medium hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                    onClick={() => followToggle(u, !u.isFollowed)}
                    disabled={processingId === u._id}
                  >
                    {u.isFollowed ? "Unfollow" : "Follow"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* -------------------------------------------------------------------
         IMAGE PREVIEW MODAL
      ------------------------------------------------------------------- */}
      {imagePreviewOpen && (
        <div 
          className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/80"
          onClick={() => setImagePreviewOpen(false)}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-12 right-0 text-white hover:text-slate-300 transition-colors"
              onClick={() => setImagePreviewOpen(false)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            
            <img
              src={previewImageUrl}
              alt={previewUsername}
              className="w-full h-auto rounded-lg shadow-2xl"
            />
            
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 rounded-b-lg">
              <p className="text-white text-lg font-semibold">{previewUsername}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
