import React from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { X, MessageCircle, UserPlus, UserMinus } from 'lucide-react';

const API = API_URL.replace(/\/api$/, '');
const PLACEHOLDER = 'https://placehold.co/80x80?text=U';

export default function UserProfileModal({
  user,
  visible,
  onClose,
  token,
  onOpenConversation,
  currentUserId,
  onNavigate,
}: any) {
  if (!visible || !user) return null;

  const [followState, setFollowState] = React.useState(user.isFollowed);
  const [details, setDetails] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [tab, setTab] = React.useState<'events'>('events');
  const [events, setEvents] = React.useState<any[]>([]);
  const [posts, setPosts] = React.useState<any[]>([]);
  const [loadingContent, setLoadingContent] = React.useState(false);
  const [eventCount, setEventCount] = React.useState<number>(0);
  const [postCount, setPostCount] = React.useState<number>(0);
  const [expandedPreview, setExpandedPreview] = React.useState<Record<string, boolean>>({});

  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  function readCache(key: string) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !obj.ts || Date.now() - obj.ts > CACHE_TTL) return null;
      return obj.data;
    } catch {
      return null;
    }
  }
  function writeCache(key: string, data: any) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch {}
  }

  React.useEffect(() => {
    if (!token || !user) return;

    setLoading(true);
    const cacheKey = `auralink-cache-user:${user._id}`;
    const cached = readCache(cacheKey);
    if (cached) {
      setDetails(cached);
      setLoading(false);
    }
    axios
      .get(API + '/api/users/' + user._id, {
        headers: { Authorization: 'Bearer ' + token },
        timeout: 8000,
      })
      .then((r) => {
        setDetails(r.data);
        writeCache(cacheKey, r.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user, token]);

  React.useEffect(() => {
    if (!user || !visible) return;
    setLoadingContent(true);
    const headers = token ? { Authorization: 'Bearer ' + token } : undefined;
    const evCacheKey = `auralink-cache-user-events:${user._id}`;
    const poCacheKey = `auralink-cache-user-posts:${user._id}`;
    const cachedEv = readCache(evCacheKey);
    const cachedPo = readCache(poCacheKey);
    if (cachedEv) {
      setEvents(cachedEv.events || cachedEv);
      setEventCount(
        cachedEv.total || (cachedEv.events ? cachedEv.events.length : cachedEv.length) || 0,
      );
    }
    if (cachedPo) {
      setPosts(cachedPo.posts || cachedPo);
      setPostCount(
        cachedPo.totalPosts || (cachedPo.posts ? cachedPo.posts.length : cachedPo.length) || 0,
      );
    }
    const eventsReq = axios.get(`${API}/api/events/user/${user._id}?page=1&limit=10`, {
      ...(headers ? { headers } : {}),
      timeout: 8000,
    });
    const postsReq = axios.get(`${API}/api/posts/user/${user._id}?page=1&limit=10`, {
      ...(headers ? { headers } : {}),
      timeout: 8000,
    });
    Promise.allSettled([eventsReq, postsReq])
      .then((results) => {
        const evResp = results[0].status === 'fulfilled' ? (results[0] as any).value.data : {};
        const ev = evResp.events || (Array.isArray(evResp) ? evResp : []);
        const poResp = results[1].status === 'fulfilled' ? (results[1] as any).value.data : {};
        const po = poResp.posts || (Array.isArray(poResp) ? poResp : []);
        setEvents(ev);
        setPosts(po);
        setEventCount(evResp.total || ev.length || 0);
        setPostCount(poResp.totalPosts || po.length || 0);
        if (ev.length)
          writeCache(evCacheKey, evResp.total ? { events: ev, total: evResp.total } : ev);
        if (po.length)
          writeCache(
            poCacheKey,
            poResp.totalPosts ? { posts: po, totalPosts: poResp.totalPosts } : po,
          );
      })
      .finally(() => setLoadingContent(false));
  }, [user, visible, token]);

  async function toggleFollow() {
    try {
      const action = followState ? 'unfollow' : 'follow';

      await axios.post(
        `${API}/api/users/${user._id}/${action}`,
        {},
        { headers: { Authorization: 'Bearer ' + token } },
      );

      setFollowState(!followState);

      // Update local details count
      if (details) {
        setDetails({
          ...details,
          followersCount: followState ? details.followersCount - 1 : details.followersCount + 1,
        });
      }
    } catch (err) {
      console.error('follow error:', err);
    }
  }

  function avatar() {
    if (!user?.avatar) return PLACEHOLDER;
    if (user.avatar.startsWith('http')) return user.avatar;
    if (user.avatar.startsWith('/')) return API + user.avatar;
    return API + '/uploads/' + user.avatar;
  }

  function formatLocation(loc: any): string {
    try {
      if (!loc) return '';
      if (typeof loc === 'string') return loc;
      const parts = [loc.name, loc.city, loc.state, loc.country].filter(Boolean);
      return parts.join(', ');
    } catch {
      return '';
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto border border-cyan-500/30 shadow-2xl">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-cyan-600 to-purple-600 p-6 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <img
            src={avatar()}
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
          {/* Followers / Following */}
          {loading ? (
            <div className="text-center py-4 text-gray-400">Loading stats...</div>
          ) : details ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur rounded-xl p-4 text-center hover:bg-white/10 transition-all">
                <div className="text-3xl font-bold text-cyan-400">
                  {details.followersCount || 0}
                </div>
                <div className="text-gray-400 text-sm mt-1">Followers</div>
              </div>

              <div className="bg-white/5 backdrop-blur rounded-xl p-4 text-center hover:bg-white/10 transition-all">
                <div className="text-3xl font-bold text-purple-400">
                  {details.followingCount || 0}
                </div>
                <div className="text-gray-400 text-sm mt-1">Following</div>
              </div>
            </div>
          ) : null}

          {/* Action Buttons */}
          {user._id === currentUserId ? (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 text-center">
              <p className="text-cyan-400 text-sm">This is your profile</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Follow/Unfollow Button */}
              <button
                onClick={toggleFollow}
                className={`w-full py-3 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                  followState
                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
                    : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white'
                }`}
              >
                {followState ? (
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

              {/* Message Button */}
              <button
                onClick={() => onOpenConversation(user)}
                className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-5 h-5" />
                Message
              </button>
            </div>
          )}

          {/* Content Tabs */}
          <div className="mt-2">
            <div className="flex items-center gap-2 mb-3">
              <button
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'events' ? 'bg-cyan-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
                onClick={() => setTab('events')}
              >
                Events {eventCount ? `(${eventCount})` : ''}
              </button>
              <button
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-white/10 text-gray-300 hover:bg-white/20"
                onClick={() => {
                  try {
                    localStorage.setItem('auralink-user-content-id', user._id);
                    localStorage.setItem('auralink-user-content-tab', 'posts');
                  } catch {}
                  if (onClose) onClose();
                  if (onNavigate) onNavigate('user-content');
                }}
                aria-label={`View all posts`}
              >
                {`View all posts${postCount ? ` (${postCount})` : ''}`}
              </button>
            </div>

            {loadingContent ? (
              <div className="text-center py-6 text-gray-400">Loading {tab}...</div>
            ) : (
              <div className="space-y-3 pr-1">
                {events.length === 0 ? (
                  <div className="text-center text-gray-400 text-sm py-6">No events yet</div>
                ) : (
                  (() => {
                    const ev = [...events].sort(
                      (a: any, b: any) =>
                        new Date(b.startDate || 0).getTime() - new Date(a.startDate || 0).getTime(),
                    )[0];
                    return (
                      <button
                        key={ev._id}
                        onClick={() => {
                          try {
                            localStorage.setItem('auralink-highlight-event', ev._id);
                            localStorage.setItem('auralink-discover-category', 'sports');
                          } catch {}
                          if (onNavigate) onNavigate('discover');
                          else window.location.href = '/';
                        }}
                        className="w-full text-left bg-white/5 rounded-xl p-3 border border-white/10 hover:border-cyan-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={ev.image || PLACEHOLDER}
                            alt={ev.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className="text-white font-semibold text-sm line-clamp-1 break-words"
                              title={ev.title || 'Untitled Event'}
                            >
                              {ev.title || 'Untitled Event'}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatLocation(ev.location)}
                            </div>
                            <div className="text-xs text-cyan-300">
                              {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ''}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })()
                )}
              </div>
            )}
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
