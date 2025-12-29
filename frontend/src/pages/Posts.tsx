// frontend/src/pages/Posts.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import {
  Heart,
  MessageCircle,
  Send,
  Trash2,
  Edit,
  X,
  Image as ImageIcon,
  Plus,
  ArrowUp,
  Share,
  Calendar,
  ShoppingBag,
  Briefcase,
  Tag as TagIcon,
  MapPin,
} from 'lucide-react';
import Avatar from '../components/Avatar';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import EventDetailModal from '../components/EventDetailModal';
import ServiceDetailModal from '../components/ServiceDetailModal';
import ProductDetailModal from '../components/ProductDetailModal';
import VenueDetailModal from '../components/VenueDetailModal';

dayjs.extend(relativeTime);

const API = API_URL.replace(/\/api$/, '');

interface Post {
  _id: string;
  author: {
    _id: string;
    username: string;
    avatar?: string;
    email: string;
  };
  caption: string;
  imageUrl: string;
  likes: string[];
  comments: Array<{
    _id: string;
    user: {
      _id: string;
      username: string;
      avatar?: string;
    };
    text: string;
    likes?: string[];
    replies?: Array<{
      user: {
        _id: string;
        username: string;
        avatar?: string;
      };
      text: string;
      createdAt: string;
    }>;
    createdAt: string;
  }>;
  tags: string[];
  location: string;
  createdAt: string;
  updatedAt: string;
  captionEditedAt?: string;
}

type FeedTab = 'posts' | 'events';

interface UnifiedItem {
  kind: 'event' | 'service' | 'product' | 'venue';
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  createdAt?: string;
  dateHint?: string; // for events
  priceHint?: string; // for services/products
  user?: { _id: string; username: string; avatar?: string };
  raw: any;
}

export default function Posts({ token, currentUserId, onShowProfile, onNavigate }: any) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FeedTab>('events');
  const [sortMode, setSortMode] = useState<'prioritized' | 'newest'>('prioritized');
  // Restore sort mode from URL or localStorage
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const s = (params.get('sort') || '').toLowerCase();
      if (s === 'new' || s === 'newest') {
        setSortMode('newest');
        return;
      }
      if (s === 'prioritized') {
        setSortMode('prioritized');
        return;
      }
      const saved = localStorage.getItem('auralink-feed-sort');
      if (saved === 'newest' || saved === 'prioritized') setSortMode(saved as any);
    } catch {}
  }, []);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ caption: '', imageUrl: '', location: '', tags: '' });
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({});
  const [uploadingImage, setUploadingImage] = useState(false);
  const [expandedCaptions, setExpandedCaptions] = useState<Record<string, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(-1);
  const imageList = React.useMemo(
    () => posts.filter((p) => !!p.imageUrl).map((p) => p.imageUrl),
    [posts],
  );

  // EVENTS FEED STATE
  const [eventFeed, setEventFeed] = useState<UnifiedItem[]>([]);
  const [eventsLoading, setEventsLoading] = useState<boolean>(false);
  const [eventPage, setEventPage] = useState<number>(1);
  const [svcPage, setSvcPage] = useState<number>(1);
  const [mktPage, setMktPage] = useState<number>(1);
  const [venuePage, setVenuePage] = useState<number>(1);
  const [hasMoreEvents, setHasMoreEvents] = useState<boolean>(true);
  
  // Persist tab across refresh and back/forward via URL query (?tab=events) and alternate per refresh
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('tab');
      if (t === 'events' || t === 'posts') {
        setTab(t as FeedTab);
        return;
      }
      // No explicit tab in URL → alternate between posts/events each refresh
      const last = (localStorage.getItem('auralink-last-feed-tab') || '') as FeedTab | '';
      const next: FeedTab = last === 'events' ? 'posts' : 'events';
      setTab(next);
      localStorage.setItem('auralink-last-feed-tab', next);
    } catch {}
  }, []);
  
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (tab === 'events') params.set('tab', 'events');
      else params.set('tab', 'posts');
      // Persist sort mode in URL
      params.set('sort', sortMode === 'newest' ? 'new' : 'prioritized');
      const qs = params.toString();
      const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
      const prevState = window.history.state || {};
      // Push a history entry so Back returns to previous tab/view
      window.history.pushState({ ...prevState, tab, sort: sortMode }, '', newUrl);
      // Persist last tab for next refresh alternation
      try { localStorage.setItem('auralink-last-feed-tab', tab); } catch {}
    } catch {}
  }, [tab, sortMode]);
  
  useEffect(() => {
    const onPop = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'events') setTab('events');
        else setTab('posts');
        const s = (params.get('sort') || '').toLowerCase();
        if (s === 'new' || s === 'newest') setSortMode('newest');
        else if (s === 'prioritized') setSortMode('prioritized');
      } catch {}
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Persist sort mode changes to localStorage and URL (handled above via [tab, sortMode] effect)
  useEffect(() => {
    try { localStorage.setItem('auralink-feed-sort', sortMode); } catch {}
  }, [sortMode]);

  // Detail modals state
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<any | null>(null);

  function openImage(url: string) {
    setPreviewImage(url);
    const idx = imageList.indexOf(url);
    setPreviewIndex(idx >= 0 ? idx : imageList.findIndex((u) => u === url));
  }
  function closeImage() {
    setPreviewImage(null);
    setPreviewIndex(-1);
  }
  function prevImage() {
    if (!imageList.length) return;
    setPreviewIndex((i) => {
      const ni = (i + imageList.length - 1) % imageList.length;
      setPreviewImage(imageList[ni]);
      return ni;
    });
  }
  function nextImage() {
    if (!imageList.length) return;
    setPreviewIndex((i) => {
      const ni = (i + 1) % imageList.length;
      setPreviewImage(imageList[ni]);
      return ni;
    });
  }
  async function shareImage(url: string) {
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'TeaKonn Photo', url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      alert('Image link copied');
    } catch {
      window.open(url, '_blank');
    }
  }
  async function downloadImage(url: string) {
    const filename = (url.split('/').pop() || 'image.jpg').split('?')[0];
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error('fetch_failed');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // Fallback: open in a new tab if CORS blocks Blob download
      try {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener';
        a.click();
      } catch {
        window.open(url, '_blank');
      }
    }
  }

  React.useEffect(() => {
    if (!previewImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeImage();
      else if (e.key === 'ArrowLeft') prevImage();
      else if (e.key === 'ArrowRight') nextImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage, imageList]);

  // Edit states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostData, setEditPostData] = useState({ caption: '', location: '', tags: '' });
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Comments collapse state
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [showAllComments, setShowAllComments] = useState<Record<string, boolean>>({});
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [commentBoxOpen, setCommentBoxOpen] = useState<Record<string, boolean>>({});
  const [expandedCommentText, setExpandedCommentText] = useState<Record<string, boolean>>({});
  const [expandedReplyText, setExpandedReplyText] = useState<
    Record<string, Record<number, boolean>>
  >({});

  // Reply state
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Scroll to top state
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [longPressPostId, setLongPressPostId] = useState<string | null>(null);
  const pressTimerRef = React.useRef<number | null>(null);
  const [showLongPressHint, setShowLongPressHint] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('auralink-hint-posts-longpress');
    } catch {
      return true;
    }
  });

  // Follow graph + rotation seed for feed ordering
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [rotationSeed, setRotationSeed] = useState<number>(() => Date.now());

  // Load following once (used to prioritize followed authors)
  useEffect(() => {
    async function fetchFollowing() {
      if (!token) return;
      try {
        const res = await axios.get(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ids: string[] = (res.data?.following || []).map((u: any) => String(u._id || u.id));
        setFollowingIds(new Set(ids));
      } catch (e) {
        console.warn('Failed to fetch following; prioritization limited:', e);
      }
    }
    fetchFollowing();
  }, [token]);

  // Compute weighted score for a post (seeded per refresh for variety)
  function scorePost(post: Post, seed?: number): number {
    const now = dayjs();
    const created = dayjs(post.createdAt || post.updatedAt || 0);
    const ageHours = Math.max(0, now.diff(created, 'hour', true));
    // Recency: 1 at 0h, 0.5 at 24h, ~0.25 at 72h, asymptotically -> 0
    const recency = 1 / (1 + ageHours / 24);
    // Followed author boost
    const isFollowed = followingIds.has(String(post.author?._id));
    const followed = isFollowed ? 1 : 0;
    // Seeded, stable noise for this refresh
    const noise = seededNoise(String(post._id), seed);
    // Small author-specific jitter to avoid repetitive ordering
    const authorNoise = seededNoise('author:' + String(post.author?._id || 'unknown'), seed);
    // Weighted sum; ensure recency dominates, followed next, then jitter for variety
    return recency * 0.55 + followed * 0.3 + noise * 0.1 + authorNoise * 0.05;
  }

  function seededNoise(key: string, seed?: number): number {
    // Simple string hash to [0,1) using provided seed (falls back to rotationSeed)
    let h = 2166136261 ^ (seed ?? rotationSeed);
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    // Convert to 0..1
    const u = (h >>> 0) / 4294967295;
    return u;
  }

  function startPostPress(postId: string) {
    try {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
      pressTimerRef.current = window.setTimeout(() => setLongPressPostId(postId), 500) as any;
      try {
        localStorage.setItem('auralink-hint-posts-longpress', 'true');
        setShowLongPressHint(false);
      } catch {}
    } catch {}
  }
  function cancelPostPress() {
    try {
      if (pressTimerRef.current) {
        window.clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    } catch {}
  }

  useEffect(() => {
    if (token) loadPosts(true);
  }, [token]);

  // Load Events/Services/Products feed when switching to events tab (first time)
  useEffect(() => {
    if (tab === 'events' && eventFeed.length === 0 && token) {
      loadEventFeed(true);
    }
  }, [tab, token]);

  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // If opened via a shared link, highlight and scroll to the post
  useEffect(() => {
    const highlightId = localStorage.getItem('auralink-highlight-post');
    if (!highlightId) return;
    const el = document.getElementById(`post-${highlightId}`);
    if (!el) return;
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-cyan-500');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-cyan-500');
        try {
          localStorage.removeItem('auralink-highlight-post');
        } catch {}
      }, 2000);
    }, 300);
  }, [posts.length]);

  const [postsPage, setPostsPage] = useState<number>(1);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(true);

  async function loadPosts(initial = false) {
    try {
      setLoading(true);
      // Use a local seed to avoid relying on async state updates
      const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
      const nextPage = initial ? 1 : postsPage + 1;
      const res = await axios.get(`${API}/api/posts`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page: nextPage, limit: 10 },
      });
      const incoming: Post[] = res.data.posts || [];
      // Merge with existing (if not initial) and deduplicate
      const merged = [...(initial ? [] : posts), ...incoming];
      const dedup = Array.from(new Map(merged.map((p) => [p._id, p])).values());
      // Sort according to mode
      const sorted =
        sortMode === 'newest'
          ? dedup.sort((a, b) => {
              const ta = dayjs(a.createdAt || 0).valueOf();
              const tb = dayjs(b.createdAt || 0).valueOf();
              return tb - ta;
            })
          : dedup.sort((a, b) => {
              const sa = scorePost(a, seed);
              const sb = scorePost(b, seed);
              if (sa !== sb) return sb - sa;
              // Stable tiebreaker by createdAt desc then id noise
              const ta = dayjs(a.createdAt || 0).valueOf();
              const tb = dayjs(b.createdAt || 0).valueOf();
              if (ta !== tb) return tb - ta;
              return seededNoise(a._id, seed) - seededNoise(b._id, seed);
            });
      setPosts(sorted);
      setPostsPage(nextPage);
      const cp = Number(res.data?.currentPage || nextPage);
      const tp = Number(res.data?.totalPages || nextPage);
      setHasMorePosts(cp < tp);
    } catch (err) {
      console.error('Failed to load posts:', err);
    } finally {
      setLoading(false);
    }
  }

  function makeUser(u: any) {
    if (!u) return undefined;
    return { _id: u._id || u.id, username: u.username, avatar: u.avatar };
  }

  function normEvent(e: any): UnifiedItem {
    const title = e.title || 'Event';
    const city = e.location?.city || e.location?.name || '';
    const sport = e.sport || '';
    const subtitle = [sport, city].filter(Boolean).join(' · ');
    const start = e.startDate ? String(e.startDate) : e.createdAt;
    const dateHint = e.startDate ? dayjs(e.startDate).format('MMM D, YYYY') : undefined;
    const img = e.image || e.cover || undefined;
    return {
      kind: 'event',
      id: e._id,
      title,
      subtitle,
      createdAt: start,
      dateHint,
      imageUrl: img,
      user: makeUser(e.organizer),
      raw: e,
    };
  }

  function normService(s: any): UnifiedItem {
    const title = s.name || s.title || 'Service';
    const city = s.location?.city || '';
    const cat = s.category || s.sport || '';
    const subtitle = [cat, city].filter(Boolean).join(' · ');
    const priceHint = s.pricing?.amount
      ? `${s.pricing.amount} ${s.pricing.currency || ''}`.trim()
      : undefined;
    const imageUrl = Array.isArray(s.images) && s.images.length > 0 ? s.images[0] : undefined;
    return {
      kind: 'service',
      id: s._id,
      title,
      subtitle,
      createdAt: s.createdAt,
      priceHint,
      imageUrl,
      user: makeUser(s.provider),
      raw: s,
    };
  }

  function normProduct(m: any): UnifiedItem {
    const title = m.title || 'Product';
    const subtitle = [m.category, m.location].filter(Boolean).join(' · ');
    const imageUrl = Array.isArray(m.images) && m.images.length > 0 ? m.images[0] : undefined;
    const priceHint = m.price !== undefined ? `${m.price} ${m.currency || ''}`.trim() : undefined;
    return {
      kind: 'product',
      id: m._id,
      title,
      subtitle,
      createdAt: m.createdAt,
      priceHint,
      imageUrl,
      user: makeUser(m.seller),
      raw: m,
    };
  }

  function normVenue(v: any): UnifiedItem {
    const title = v.name || 'Venue';
    const city = v.location?.city || v.location?.name || '';
    const capacity = v.capacity?.max ? `Capacity: ${v.capacity.max}` : '';
    const subtitle = [city, capacity].filter(Boolean).join(' · ');
    const imageUrl = Array.isArray(v.images) && v.images.length > 0 ? v.images[0] : undefined;
    return {
      kind: 'venue',
      id: v._id,
      title,
      subtitle,
      createdAt: v.createdAt,
      imageUrl,
      user: undefined,
      raw: v,
    };
  }

  async function loadEventFeed(initial = false) {
    try {
      setEventsLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const nextEvent = initial ? 1 : eventPage + 1;
      const nextSvc = initial ? 1 : svcPage + 1;
      const nextMkt = initial ? 1 : mktPage + 1;
      const nextVenue = initial ? 1 : venuePage + 1;

      const [eventsRes, servicesRes, marketRes, venuesRes] = await Promise.all([
        axios.get(`${API}/api/events`, { headers, params: { page: initial ? 1 : nextEvent, limit: 10 } }),
        axios.get(`${API}/api/services`, {
          headers,
          params: { page: initial ? 1 : nextSvc, limit: 10 },
        }),
        axios.get(`${API}/api/marketplace`, {
          headers,
          params: { page: initial ? 1 : nextMkt, limit: 10 },
        }),
        axios.get(`${API}/api/venues/search`, {
          headers,
          params: { page: initial ? 1 : nextVenue, limit: 10, name: '' },
        }),
      ]);

      const evs = (eventsRes.data?.events || eventsRes.data || []).map(normEvent);
      const svs = (servicesRes.data?.services || servicesRes.data || []).map(normService);
      const mkt = (marketRes.data?.items || marketRes.data || []).map(normProduct);
      const vns = (venuesRes.data?.venues || venuesRes.data || []).map(normVenue);

      const combined = [...(initial ? [] : eventFeed), ...evs, ...svs, ...mkt, ...vns];
      const dedup = Array.from(new Map(combined.map((i) => [i.kind + ':' + i.id, i])).values());
      // Seed per refresh/load to rotate events ordering while keeping recency dominance
      const seed = (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) >>> 0;
      function scoreItem(x: UnifiedItem): number {
        const ta = x.createdAt ? dayjs(x.createdAt).valueOf() : 0;
        // Recency scaled like posts
        const ageHours = Math.max(0, (Date.now() - ta) / (1000 * 60 * 60));
        const recency = 1 / (1 + ageHours / 24);
        // Followed owner boost if present
        const uid = x.user?._id ? String(x.user._id) : '';
        const followed = uid && followingIds.has(uid) ? 1 : 0;
        // Kind-based jitter to interleave categories
        const kindNoise = seededNoise('kind:' + x.kind, seed);
        // Item-specific jitter
        const idNoise = seededNoise(x.kind + ':' + x.id, seed);
        return recency * 0.6 + followed * 0.25 + kindNoise * 0.1 + idNoise * 0.05;
      }
      const sorted =
        sortMode === 'newest'
          ? dedup.sort((a, b) => {
              const ta = a.createdAt ? dayjs(a.createdAt).valueOf() : 0;
              const tb = b.createdAt ? dayjs(b.createdAt).valueOf() : 0;
              return tb - ta;
            })
          : dedup.sort((a, b) => {
              const sa = scoreItem(a);
              const sb = scoreItem(b);
              if (sa !== sb) return sb - sa;
              const ta = a.createdAt ? dayjs(a.createdAt).valueOf() : 0;
              const tb = b.createdAt ? dayjs(b.createdAt).valueOf() : 0;
              if (ta !== tb) return tb - ta;
              return (
                seededNoise(a.kind + ':' + a.id, seed) - seededNoise(b.kind + ':' + b.id, seed)
              );
            });
      setEventFeed(sorted);
      const evDone = (eventsRes.data?.currentPage || 1) >= (eventsRes.data?.totalPages || 1);
      if (initial) {
        setEventPage(1);
        setSvcPage(1);
        setMktPage(1);
        setVenuePage(1);
        setHasMoreEvents(!(evDone));
      } else {
        setEventPage(nextEvent);
        setSvcPage(nextSvc);
        setMktPage(nextMkt);
        setVenuePage(nextVenue);
        const svcDone =
          servicesRes.data?.pagination?.page >= servicesRes.data?.pagination?.pages;
        const mktDone = marketRes.data?.currentPage >= marketRes.data?.totalPages;
        const vnsDone = (venuesRes.data?.page || 1) >= (venuesRes.data?.totalPages || 1);
        // Keep loading while any source still has more
        setHasMoreEvents(!(evDone && svcDone && mktDone && vnsDone));
      }
    } catch (e) {
      console.error('Failed to load events feed', e);
    } finally {
      setEventsLoading(false);
    }
  }

  function TypePill({ kind }: { kind: UnifiedItem['kind'] }) {
    const cls =
      kind === 'event'
        ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
        : kind === 'service'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : kind === 'product'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            : 'bg-sky-500/10 text-sky-600 dark:text-sky-400';
    const Icon = kind === 'event' ? Calendar : kind === 'service' ? Briefcase : kind === 'product' ? ShoppingBag : MapPin;
    const label = kind === 'event' ? 'Event' : kind === 'service' ? 'Service' : kind === 'product' ? 'Product' : 'Venue';
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium border ${cls}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <Icon className="w-3.5 h-3.5" /> {label}
      </span>
    );
  }

  function makeAvatarUrl(avatar?: string) {
    if (!avatar) return 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff';
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('/')) return API + avatar;
    return API + '/uploads/' + avatar;
  }

  async function handleCreatePost() {
    if (!newPost.caption.trim() && !newPost.imageUrl) {
      alert('Please add a caption or image');
      return;
    }

    try {
      const tags = newPost.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await axios.post(
        `${API}/api/posts`,
        {
          caption: newPost.caption,
          imageUrl: newPost.imageUrl,
          tags,
          location: newPost.location,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setPosts([res.data, ...posts]);
      setNewPost({ caption: '', imageUrl: '', location: '', tags: '' });
      setCreateModalOpen(false);
    } catch (err) {
      console.error('Failed to create post:', err);
      alert('Failed to create post');
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API}/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setNewPost({ ...newPost, imageUrl: res.data.url });
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleLike(postId: string) {
    // Optimistic toggle
    const prev = posts;
    setPosts((list) =>
      list.map((p) => {
        if (p._id !== postId) return p;
        const liked = p.likes.includes(currentUserId);
        return {
          ...p,
          likes: liked ? p.likes.filter((id) => id !== currentUserId) : [...p.likes, currentUserId],
        };
      }),
    );

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error('Failed to like post:', err);
      // Revert on error
      setPosts(prev);
    }
  }

  async function handleComment(postId: string) {
    const text = commentTexts[postId]?.trim();
    if (!text) return;

    // Optimistic add
    const prev = posts;
    const tempId = `temp-${Date.now()}`;
    const tempComment = {
      _id: tempId,
      user: {
        _id: currentUserId,
        username: currentUser?.username || 'You',
        avatar: currentUser?.avatar,
      },
      text,
      likes: [],
      replies: [],
      createdAt: new Date().toISOString(),
    } as any;

    setPosts((list) =>
      list.map((p) => (p._id === postId ? { ...p, comments: [...p.comments, tempComment] } : p)),
    );
    setCommentTexts({ ...commentTexts, [postId]: '' });

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/comment`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error('Failed to add comment:', err);
      // Revert and restore input
      setPosts(prev);
      setCommentTexts({ ...commentTexts, [postId]: text });
    }
  }

  async function handleDeletePost(postId: string) {
    if (!confirm('Delete this post?')) return;

    try {
      await axios.delete(`${API}/api/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(posts.filter((p) => p._id !== postId));
    } catch (err) {
      console.error('Failed to delete post:', err);
      alert('Failed to delete post');
    }
  }

  function getPostShareUrl(post: Post) {
    try {
      const origin = window.location.origin;
      const url = `${origin}/?view=posts&post=${post._id}`;
      return url;
    } catch {
      return `/?view=posts&post=${post._id}`;
    }
  }

  async function handleSharePost(post: Post) {
    const shareUrl = getPostShareUrl(post);
    const title = `${post.author.username}'s post`;
    const text = post.caption || 'Check out this post on TeaKonn!';
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: shareUrl });
        return;
      }
    } catch (e) {
      console.warn('Web Share aborted or failed:', e);
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard');
    } catch (e) {
      console.error('Clipboard copy failed:', e);
      alert(shareUrl);
    }
  }

  function startEditPost(post: Post) {
    setEditingPostId(post._id);
    setEditPostData({
      caption: post.caption,
      location: post.location,
      tags: post.tags.join(', '),
    });
  }

  async function handleUpdatePost() {
    if (!editingPostId) return;

    try {
      const tags = editPostData.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await axios.put(
        `${API}/api/posts/${editingPostId}`,
        {
          caption: editPostData.caption,
          tags,
          location: editPostData.location,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setPosts(posts.map((p) => (p._id === editingPostId ? res.data : p)));
      setEditingPostId(null);
      setEditPostData({ caption: '', location: '', tags: '' });
    } catch (err) {
      console.error('Failed to update post:', err);
      alert('Failed to update post');
    }
  }

  async function handleDeleteComment(postId: string, commentId: string) {
    if (!confirm('Delete this comment?')) return;

    try {
      const res = await axios.delete(`${API}/api/posts/${postId}/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setPosts(posts.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment');
    }
  }

  function startEditComment(comment: any) {
    setEditingCommentId(comment._id);
    setEditCommentText(comment.text);
  }

  async function handleLikeComment(postId: string, commentId: string) {
    // Optimistic toggle
    const prev = posts;
    setPosts((list) =>
      list.map((p) => {
        if (p._id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) => {
            if (c._id !== commentId) return c;
            const likes = c.likes || [];
            const liked = likes.includes(currentUserId);
            return {
              ...c,
              likes: liked ? likes.filter((id) => id !== currentUserId) : [...likes, currentUserId],
            };
          }),
        };
      }),
    );

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/comment/${commentId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error('Failed to like comment:', err);
      setPosts(prev);
    }
  }

  async function handleReplyToComment(postId: string, commentId: string) {
    if (!replyText.trim()) return;

    const text = replyText.trim();
    const prev = posts;
    const tempReply = {
      user: {
        _id: currentUserId,
        username: currentUser?.username || 'You',
        avatar: currentUser?.avatar,
      },
      text,
      createdAt: new Date().toISOString(),
      _id: `tempreply-${Date.now()}`,
    } as any;

    // Optimistic add
    setPosts((list) =>
      list.map((p) => {
        if (p._id !== postId) return p;
        return {
          ...p,
          comments: p.comments.map((c) =>
            c._id === commentId ? { ...c, replies: [...(c.replies || []), tempReply] } : c,
          ),
        };
      }),
    );
    setReplyingTo(null);
    setReplyText('');

    try {
      const res = await axios.post(
        `${API}/api/posts/${postId}/comment/${commentId}/reply`,
        { text },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPosts((list) => list.map((p) => (p._id === postId ? res.data : p)));
    } catch (err) {
      console.error('Failed to reply to comment:', err);
      alert('Failed to reply to comment');
      setPosts(prev);
      // Optionally restore reply draft
      setReplyingTo(commentId);
      setReplyText(text);
    }
  }

  function toggleComments(postId: string) {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }

  function toggleShowAll(postId: string) {
    setShowAllComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  }

  function toggleReplies(commentId: string) {
    setExpandedReplies((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }

  function formatTimestamp(dateString: string) {
    const date = dayjs(dateString);
    const now = dayjs();
    const diffInHours = now.diff(date, 'hour');

    if (diffInHours < 24) {
      return date.fromNow(); // "2 hours ago"
    } else if (diffInHours < 168) {
      // Less than 7 days
      return date.format('dddd [at] h:mm A'); // "Monday at 3:45 PM"
    } else {
      return date.format('MMM D, YYYY [at] h:mm A'); // "Dec 14, 2025 at 3:45 PM"
    }
  }

  function toggleCommentBox(postId: string) {
    setCommentBoxOpen((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  return (
    <div className="min-h-screen themed-page p-4 sm:p-6">
      <div className="max-w-3xl lg:max-w-4xl mx-auto">
        {/* Header + Tabs */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
            Feed
          </h1>
          <div className="flex items-center gap-3">
            <div className="flex rounded-md border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
              <button
                className={`px-2 py-1 text-xs ${sortMode === 'prioritized' ? 'bg-cyan-600 text-white' : 'themed-card'}`}
                onClick={() => setSortMode('prioritized')}
                aria-pressed={sortMode === 'prioritized'}
              >
                Prioritized
              </button>
              <button
                className={`px-2 py-1 text-xs ${sortMode === 'newest' ? 'bg-cyan-600 text-white' : 'themed-card'}`}
                onClick={() => setSortMode('newest')}
                aria-pressed={sortMode === 'newest'}
              >
                Newest
              </button>
            </div>
          {tab === 'posts' ? (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              Create Post
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadEventFeed(true)}
                className="px-3 py-2 rounded-xl border text-sm"
                style={{ borderColor: 'var(--border)' }}
                disabled={eventsLoading}
              >
                {eventsLoading ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-6" role="tablist" aria-label="Feed Tabs">
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              tab === 'posts' ? 'bg-cyan-600 text-white' : 'themed-card'
            }`}
            onClick={() => setTab('posts')}
            aria-selected={tab === 'posts'}
          >
            Posts
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${
              tab === 'events' ? 'bg-purple-600 text-white' : 'themed-card'
            }`}
            onClick={() => setTab('events')}
            aria-selected={tab === 'events'}
          >
            Events
          </button>
        </div>

        {/* Tab Content */}
        {tab === 'posts' ? (
          loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-6 animate-pulse themed-card">
                <div className="h-64 themed-card"></div>
              </div>
            ))}
          </div>
          ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-16 h-16 text-theme-secondary mx-auto mb-4" />
            <p className="text-theme-secondary text-lg">No posts yet</p>
            <p className="text-theme-secondary text-sm mt-2">Be the first to share something!</p>
          </div>
          ) : (
          <div className="space-y-4">
            {showLongPressHint && (
              <div
                className="rounded-lg px-3 py-2 text-xs bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 border"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-theme-secondary">
                    Tip: Press and hold a post to edit or delete.
                  </span>
                  <button
                    className="text-[11px] px-2 py-1 rounded-md bg-white/60 dark:bg-slate-700/60 hover:opacity-80"
                    onClick={() => {
                      try {
                        localStorage.setItem('auralink-hint-posts-longpress', 'true');
                      } catch {}
                      setShowLongPressHint(false);
                    }}
                  >
                    Got it
                  </button>
                </div>
              </div>
            )}
            {posts.map((post) => (
              <div
                key={post._id}
                id={`post-${post._id}`}
                className="rounded-2xl shadow-md themed-card"
                style={{ overflow: 'visible' }}
                onMouseDown={() => startPostPress(post._id)}
                onMouseUp={cancelPostPress}
                onMouseLeave={cancelPostPress}
                onTouchStart={() => startPostPress(post._id)}
                onTouchEnd={cancelPostPress}
              >
                {/* Post Header */}
                <div
                  className="flex items-center justify-between p-3 relative z-10"
                  style={{ overflow: 'visible' }}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      src={makeAvatarUrl(post.author.avatar)}
                      className="w-10 h-10 rounded-full object-cover cursor-pointer"
                      alt={post.author.username}
                      onClick={() => onShowProfile(post.author)}
                    />
                    <div>
                      <div
                        className="font-semibold text-heading cursor-pointer hover:text-cyan-500"
                        onClick={() => onShowProfile(post.author)}
                      >
                        {post.author.username}
                      </div>
                      {post.location && (
                        <div className="text-xs text-theme-secondary">{post.location}</div>
                      )}
                    </div>
                  </div>

                  {/* Share + Long-press actions */}
                  <div className="flex items-center gap-1.5 relative">
                    <button
                      onClick={() => handleSharePost(post)}
                      className="p-2 hover:opacity-80 rounded-full themed-card"
                      title="Share"
                    >
                      <Share className="w-5 h-5 text-theme-secondary" />
                    </button>
                    {post.author._id === currentUserId && longPressPostId === post._id && (
                      <div
                        className="absolute right-0 top-10 z-20 w-56 rounded-lg shadow-2xl themed-menu"
                        style={{ overflow: 'visible' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={() => {
                            setLongPressPostId(null);
                            startEditPost(post);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-theme hover:opacity-90"
                        >
                          <Edit className="w-4 h-4" />
                          Edit Post
                        </button>
                        <button
                          onClick={() => {
                            setLongPressPostId(null);
                            handleDeletePost(post._id);
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:opacity-90"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Post
                        </button>
                        <div className="border-t" style={{ borderColor: 'var(--border)' }} />
                        <button
                          onClick={() => setLongPressPostId(null)}
                          className="w-full px-4 py-2 text-xs text-theme-secondary text-left hover:opacity-80"
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Image (standardized height) */}
                {post.imageUrl && (
                  <div
                    className="w-full h-64 sm:h-72 md:h-80 overflow-hidden rounded-t-2xl relative group cursor-zoom-in"
                    onClick={() => openImage(post.imageUrl)}
                  >
                    <img src={post.imageUrl} alt="Post" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  </div>
                )}

                {/* Actions */}
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleLike(post._id)}
                      className="flex items-center gap-1.5 group"
                    >
                      <Heart
                        className={`w-5 h-5 transition-all ${
                          post.likes.includes(currentUserId)
                            ? 'fill-red-500 text-red-500'
                            : 'text-theme-secondary group-hover:text-red-500'
                        }`}
                      />
                      <span className="text-sm font-medium text-theme-secondary">
                        {post.likes.length}
                      </span>
                    </button>
                    <button
                      onClick={() => toggleCommentBox(post._id)}
                      className="flex items-center gap-1.5 text-theme-secondary hover:text-cyan-500"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span className="text-sm font-medium">{post.comments.length}</span>
                    </button>
                  </div>

                  {/* Caption - Editable if editing */}
                  {editingPostId === post._id ? (
                    <div className="space-y-3 p-4 themed-card rounded-lg">
                      <textarea
                        value={editPostData.caption}
                        onChange={(e) =>
                          setEditPostData({ ...editPostData, caption: e.target.value })
                        }
                        className="input w-full resize-none"
                        rows={3}
                        placeholder="Caption..."
                        maxLength={280}
                      />
                      <input
                        type="text"
                        value={editPostData.location}
                        onChange={(e) =>
                          setEditPostData({ ...editPostData, location: e.target.value })
                        }
                        className="input w-full"
                        placeholder="Location..."
                        maxLength={100}
                      />
                      <input
                        type="text"
                        value={editPostData.tags}
                        onChange={(e) => setEditPostData({ ...editPostData, tags: e.target.value })}
                        className="input w-full"
                        placeholder="Tags (comma-separated)..."
                        maxLength={100}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleUpdatePost} className="btn">
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingPostId(null);
                            setEditPostData({ caption: '', location: '', tags: '' });
                          }}
                          className="themed-card"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {post.caption && (
                        <div>
                          <p
                            className="text-heading"
                            style={
                              expandedCaptions[post._id]
                                ? ({} as any)
                                : ({
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                  } as any)
                            }
                          >
                            <span className="font-semibold mr-2">{post.author.username}</span>
                            {post.caption}
                          </p>
                          {post.caption.length > 240 && (
                            <button
                              className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                              onClick={() =>
                                setExpandedCaptions((prev) => ({
                                  ...prev,
                                  [post._id]: !prev[post._id],
                                }))
                              }
                            >
                              {expandedCaptions[post._id] ? 'See less' : 'See more'}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Tags */}
                      {post.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          {post.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full text-xs text-cyan-600 dark:text-cyan-400"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {post.tags.length > 3 && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs text-theme-secondary"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              …
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <div className="text-xs text-theme-secondary">
                        {formatTimestamp(post.createdAt)}
                        {post.captionEditedAt && <span className="ml-2 italic">(edited)</span>}
                      </div>
                    </>
                  )}

                  {/* Comments */}
                  {post.comments.length > 0 && (
                    <div className="pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                      {!expandedComments[post._id] ? (
                        <button
                          onClick={() => toggleComments(post._id)}
                          className="text-sm text-theme-secondary hover:opacity-80 mb-2"
                        >
                          Show comments ({post.comments.length})
                        </button>
                      ) : (
                        <>
                          {post.comments.length > 3 && !showAllComments[post._id] && (
                            <button
                              onClick={() => toggleShowAll(post._id)}
                              className="text-sm text-theme-secondary hover:opacity-80 mb-2"
                            >
                              View all {post.comments.length} comments
                            </button>
                          )}
                          <div className="space-y-3">
                            {(showAllComments[post._id]
                              ? post.comments
                              : post.comments.slice(-3)
                            ).map((comment) => (
                              <div key={comment._id} className="flex gap-2 group">
                                <Avatar
                                  src={makeAvatarUrl(comment.user.avatar)}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                                  alt={comment.user.username}
                                />
                                <div className="flex-1 min-w-0">
                                  {editingCommentId === comment._id ? (
                                    <div className="space-y-2">
                                      <textarea
                                        value={editCommentText}
                                        onChange={(e) => setEditCommentText(e.target.value)}
                                        className="input w-full text-sm resize-none"
                                        rows={2}
                                      />
                                      <div className="flex gap-2">
                                        <button
                                          onClick={async () => {
                                            if (!editCommentText.trim()) return;
                                            try {
                                              const res = await axios.put(
                                                `${API}/api/posts/${post._id}/comment/${comment._id}`,
                                                { text: editCommentText },
                                                { headers: { Authorization: `Bearer ${token}` } },
                                              );
                                              setPosts(
                                                posts.map((p) =>
                                                  p._id === post._id ? res.data : p,
                                                ),
                                              );
                                              setEditingCommentId(null);
                                              setEditCommentText('');
                                            } catch (err) {
                                              console.error('Failed to edit comment:', err);
                                              alert('Failed to edit comment');
                                            }
                                          }}
                                          className="btn text-xs"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingCommentId(null)}
                                          className="themed-card text-xs"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <span className="font-semibold text-sm text-heading mr-2">
                                            {comment.user.username}
                                          </span>
                                          <div className="text-sm text-theme-secondary">
                                            <div
                                              style={{
                                                display: expandedCommentText[comment._id]
                                                  ? 'block'
                                                  : '-webkit-box',
                                                WebkitLineClamp: expandedCommentText[comment._id]
                                                  ? undefined
                                                  : 4,
                                                WebkitBoxOrient: 'vertical' as any,
                                                overflow: expandedCommentText[comment._id]
                                                  ? 'visible'
                                                  : 'hidden',
                                              }}
                                            >
                                              {comment.text}
                                            </div>
                                            {comment.text && comment.text.length > 200 && (
                                              <button
                                                className="mt-1 text-xs text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                                                onClick={() =>
                                                  setExpandedCommentText((prev) => ({
                                                    ...prev,
                                                    [comment._id]: !prev[comment._id],
                                                  }))
                                                }
                                              >
                                                {expandedCommentText[comment._id]
                                                  ? 'See less'
                                                  : 'See more'}
                                              </button>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs text-theme-secondary">
                                              {formatTimestamp(comment.createdAt)}
                                            </span>
                                            {comment.likes && comment.likes.length > 0 && (
                                              <span className="text-xs text-theme-secondary">
                                                {comment.likes.length}{' '}
                                                {comment.likes.length === 1 ? 'like' : 'likes'}
                                              </span>
                                            )}
                                            <button
                                              onClick={() =>
                                                handleLikeComment(post._id, comment._id)
                                              }
                                              className={`text-xs font-medium ${
                                                comment.likes?.includes(currentUserId)
                                                  ? 'text-red-500'
                                                  : 'text-theme-secondary hover:text-red-500'
                                              }`}
                                            >
                                              Like
                                            </button>
                                            <button
                                              onClick={() => {
                                                setReplyingTo(comment._id);
                                                setReplyText('');
                                              }}
                                              className="text-xs text-theme-secondary hover:text-cyan-500 font-medium"
                                            >
                                              Reply
                                            </button>
                                            {comment.user._id === currentUserId && (
                                              <>
                                                <button
                                                  onClick={() => startEditComment(comment)}
                                                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-cyan-500 font-medium"
                                                >
                                                  Edit
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleDeleteComment(post._id, comment._id)
                                                  }
                                                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                                                >
                                                  Delete
                                                </button>
                                              </>
                                            )}
                                            {post.author._id === currentUserId &&
                                              comment.user._id !== currentUserId && (
                                                <button
                                                  onClick={() =>
                                                    handleDeleteComment(post._id, comment._id)
                                                  }
                                                  className="text-xs text-red-500 hover:text-red-600 font-medium"
                                                >
                                                  Delete
                                                </button>
                                              )}
                                          </div>
                                        </div>
                                      </div>
                                    </>
                                  )}

                                  {comment.replies && comment.replies.length > 0 && (
                                    <div
                                      className="ml-4 mt-2 border-l-2 pl-3"
                                      style={{ borderColor: 'var(--border)' }}
                                    >
                                      {!expandedReplies[comment._id] ? (
                                        <button
                                          onClick={() => toggleReplies(comment._id)}
                                          className="text-xs text-theme-secondary hover:opacity-80"
                                        >
                                          View replies ({comment.replies.length})
                                        </button>
                                      ) : (
                                        <>
                                          <div className="space-y-2">
                                            {comment.replies.map((reply: any, idx: number) => (
                                              <div key={idx} className="flex gap-2">
                                                <Avatar
                                                  src={makeAvatarUrl(reply.user.avatar)}
                                                  className="w-5 h-5 rounded-full object-cover flex-shrink-0"
                                                  alt={reply.user.username}
                                                />
                                                <div>
                                                  <span className="font-semibold text-xs text-heading mr-1">
                                                    {reply.user.username}
                                                  </span>
                                                  <div className="text-xs text-theme-secondary">
                                                    <div
                                                      style={{
                                                        display: expandedReplyText[comment._id]?.[
                                                          idx
                                                        ]
                                                          ? 'block'
                                                          : '-webkit-box',
                                                        WebkitLineClamp: expandedReplyText[
                                                          comment._id
                                                        ]?.[idx]
                                                          ? undefined
                                                          : 3,
                                                        WebkitBoxOrient: 'vertical' as any,
                                                        overflow: expandedReplyText[comment._id]?.[
                                                          idx
                                                        ]
                                                          ? 'visible'
                                                          : 'hidden',
                                                      }}
                                                    >
                                                      {reply.text}
                                                    </div>
                                                    {reply.text && reply.text.length > 160 && (
                                                      <button
                                                        className="mt-0.5 text-[10px] text-cyan-600 dark:text-cyan-400 hover:opacity-80"
                                                        onClick={() =>
                                                          setExpandedReplyText((prev) => ({
                                                            ...prev,
                                                            [comment._id]: {
                                                              ...(prev[comment._id] || {}),
                                                              [idx]: !(prev[comment._id] || {})[
                                                                idx
                                                              ],
                                                            },
                                                          }))
                                                        }
                                                      >
                                                        {expandedReplyText[comment._id]?.[idx]
                                                          ? 'See less'
                                                          : 'See more'}
                                                      </button>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-theme-secondary mt-0.5">
                                                    {formatTimestamp(reply.createdAt)}
                                                  </div>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                          <button
                                            onClick={() => toggleReplies(comment._id)}
                                            className="text-xs text-theme-secondary hover:opacity-80 mt-1"
                                          >
                                            Hide replies
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}

                                  {replyingTo === comment._id && (
                                    <div className="ml-4 mt-2 flex gap-2">
                                      <input
                                        type="text"
                                        placeholder="Write a reply..."
                                        className="input flex-1 text-xs"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyPress={(e) => {
                                          if (e.key === 'Enter') {
                                            handleReplyToComment(post._id, comment._id);
                                          }
                                        }}
                                        maxLength={300}
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleReplyToComment(post._id, comment._id)}
                                        className="btn px-3 py-1.5 text-xs"
                                      >
                                        Send
                                      </button>
                                      <button
                                        onClick={() => {
                                          setReplyingTo(null);
                                          setReplyText('');
                                        }}
                                        className="themed-card px-3 py-1.5 text-xs"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-2">
                            {post.comments.length > 3 && showAllComments[post._id] && (
                              <button
                                onClick={() => toggleShowAll(post._id)}
                                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                              >
                                Show recent
                              </button>
                            )}
                            <button
                              onClick={() => toggleComments(post._id)}
                              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              Hide comments
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Add Comment (hidden until toggled) */}
                  {commentBoxOpen[post._id] && (
                    <div
                      className="flex items-center gap-2 pt-3 mt-1 border-t rounded-xl"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="input flex-1 min-w-0 text-sm"
                        value={commentTexts[post._id] || ''}
                        onChange={(e) =>
                          setCommentTexts({ ...commentTexts, [post._id]: e.target.value })
                        }
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') handleComment(post._id);
                        }}
                        maxLength={300}
                        autoFocus
                      />
                      <button
                        onClick={() => handleComment(post._id)}
                        className="btn px-3 py-2 shrink-0"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {hasMorePosts && (
              <div className="flex justify-center pt-2">
                <button
                  className="px-4 py-2 rounded-xl border text-sm"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => loadPosts(false)}
                  disabled={loading}
                >
                  {loading ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
          )
        ) : (
          // EVENTS FEED TAB
          <div className="space-y-4">
            {eventsLoading && eventFeed.length === 0 ? (
              <div className="space-y-6">
                {[1, 2].map((i) => (
                  <div key={i} className="rounded-2xl p-6 animate-pulse themed-card">
                    <div className="h-48 themed-card"></div>
                  </div>
                ))}
              </div>
            ) : eventFeed.length === 0 ? (
              <div className="text-center py-16">
                <ImageIcon className="w-14 h-14 text-theme-secondary mx-auto mb-3" />
                <p className="text-theme-secondary">No items yet</p>
              </div>
            ) : (
              <>
                {eventFeed.map((item) => (
                  <div
                    key={`${item.kind}:${item.id}`}
                    className="rounded-2xl themed-card overflow-hidden border hover:shadow-xl hover:-translate-y-[2px] transition-all"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={
                            item.user?.avatar
                              ? item.user.avatar.startsWith('http')
                                ? item.user.avatar
                                : API + (item.user.avatar.startsWith('/') ? item.user.avatar : '/uploads/' + item.user.avatar)
                              : 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff'
                          }
                          className="w-9 h-9 rounded-full object-cover cursor-pointer"
                          alt={item.user?.username || 'User'}
                          onClick={() => item.user && onShowProfile?.(item.user)}
                        />
                        <div>
                          <div className="font-semibold text-heading">{item.user?.username || (item.kind === 'product' ? 'Seller' : 'Organizer')}</div>
                          {item.createdAt && (
                            <div className="text-xs text-theme-secondary">{dayjs(item.createdAt).fromNow()}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <TypePill kind={item.kind} />
                        {item.kind === 'event' && item.dateHint && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border" style={{ borderColor: 'var(--border)' }}>
                            <Calendar className="w-3.5 h-3.5" /> {item.dateHint}
                          </span>
                        )}
                        {item.kind !== 'event' && item.priceHint && (
                          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border" style={{ borderColor: 'var(--border)' }}>
                            <TagIcon className="w-3.5 h-3.5" /> {item.priceHint}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Media */}
                    {item.imageUrl && (
                      <div className="relative w-full h-56 sm:h-64 overflow-hidden">
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-black/0 to-transparent" />
                        <div className="absolute top-2 left-2">
                          <TypePill kind={item.kind} />
                        </div>
                      </div>
                    )}

                    {/* Body */}
                    <div className="p-3 space-y-2">
                      <div className="text-lg font-bold text-heading">{item.title}</div>
                      {item.subtitle && <div className="text-sm text-theme-secondary">{item.subtitle}</div>}
                      <div className="pt-2 flex items-center gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                        {item.kind === 'event' ? (
                          <button
                            className="btn px-3 py-1.5 text-sm"
                            onClick={() => setSelectedEvent(item.raw)}
                          >
                            View Event
                          </button>
                        ) : item.kind === 'service' ? (
                          <button
                            className="btn px-3 py-1.5 text-sm"
                            onClick={() => setSelectedService(item.raw)}
                          >
                            View Service
                          </button>
                        ) : item.kind === 'product' ? (
                          <button
                            className="btn px-3 py-1.5 text-sm"
                            onClick={() => setSelectedProduct(item.raw)}
                          >
                            View Product
                          </button>
                        ) : (
                          <button
                            className="btn px-3 py-1.5 text-sm"
                            onClick={() => setSelectedVenue(item.raw)}
                          >
                            View Venue
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {hasMoreEvents && (
                  <div className="flex justify-center pt-2">
                    <button
                      className="px-4 py-2 rounded-xl border text-sm"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => loadEventFeed(false)}
                      disabled={eventsLoading}
                    >
                      {eventsLoading ? 'Loading…' : 'Load more'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Lightbox Preview */}
        {previewImage && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
            onClick={closeImage}
          >
            <button
              onClick={closeImage}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
              aria-label="Close image preview"
            >
              <X className="w-6 h-6" />
            </button>
            {imageList.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                  className="absolute left-4 mid:top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                  className="absolute right-4 mid:top-1/2 -translate-y-1/2 text-white bg-black/40 hover:bg-black/60 rounded-full p-3"
                >
                  ›
                </button>
              </>
            )}
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  shareImage(previewImage);
                }}
                className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm"
              >
                Share
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  downloadImage(previewImage);
                }}
                className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-sm"
              >
                Download
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            className="rounded-2xl p-6 w-full max-w-lg"
            style={{
              background: 'var(--card)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-heading">Create Post</h2>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 hover:opacity-80 rounded-full themed-card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                placeholder="What's on your mind?"
                className="input w-full resize-none"
                rows={4}
                value={newPost.caption}
                onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                maxLength={280}
              />

              <input
                type="text"
                placeholder="Location (optional)"
                className="input w-full"
                value={newPost.location}
                onChange={(e) => setNewPost({ ...newPost, location: e.target.value })}
                maxLength={100}
              />

              <input
                type="text"
                placeholder="Tags (comma-separated)"
                className="input w-full"
                value={newPost.tags}
                onChange={(e) => setNewPost({ ...newPost, tags: e.target.value })}
                maxLength={100}
              />

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="post-image-upload"
                />
                <label
                  htmlFor="post-image-upload"
                  className="flex items-center justify-center gap-2 w-full px-4 py-8 rounded-xl cursor-pointer hover:border-cyan-400 transition-colors"
                  style={{ border: '2px dashed var(--border)' }}
                >
                  {uploadingImage ? (
                    <span className="text-theme-secondary">Uploading...</span>
                  ) : newPost.imageUrl ? (
                    <img src={newPost.imageUrl} alt="Preview" className="max-h-40 rounded-lg" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-theme-secondary" />
                      <span className="text-theme-secondary">Click to upload image</span>
                    </>
                  )}
                </label>
              </div>

              <button
                onClick={handleCreatePost}
                disabled={uploadingImage}
                className="btn w-full py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? 'Uploading...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 p-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50 hover:scale-110"
          aria-label="Scroll to top"
        >
          <ArrowUp className="w-6 h-6" />
        </button>
      )}

      {/* Detail Modals */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onJoin={async (eventId: string) => {
            try {
              await axios.post(`${API}/api/events/${eventId}/join`, {}, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              const refreshed = await axios.get(`${API}/api/events/${eventId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
              });
              setSelectedEvent(refreshed.data);
            } catch (err) {
              console.error('Join error:', err);
            }
          }}
          onMessage={(organizerId: string) => {
            try { localStorage.setItem('auralink-open-chat-with', organizerId); } catch {}
            onNavigate && onNavigate('dashboard');
          }}
          onViewProfile={(userId: string) => {
            const user = selectedEvent?.organizer ? { ...selectedEvent.organizer, _id: selectedEvent.organizer._id } : null;
            if (user) {
              (onShowProfile as any)?.(user);
            }
          }}
          currentUserId={currentUserId}
        />
      )}

      {selectedService && (
        <ServiceDetailModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
          onMessage={(providerId: string) => {
            try { localStorage.setItem('auralink-open-chat-with', providerId); } catch {}
            onNavigate && onNavigate('dashboard');
          }}
          onLike={async (serviceId: string) => {
            try {
              await axios.post(`${API}/api/services/${serviceId}/like`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
              const refreshed = await axios.get(`${API}/api/services/${serviceId}`);
              setSelectedService(refreshed.data);
            } catch (e) {
              console.error('Failed to like service', e);
            }
          }}
          currentUserId={currentUserId}
        />
      )}

      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onMessage={(sellerId: string) => {
            try { localStorage.setItem('auralink-open-chat-with', sellerId); } catch {}
            onNavigate && onNavigate('dashboard');
          }}
          onLike={async (productId: string) => {
            try {
              const res = await axios.post(`${API}/api/marketplace/${productId}/like`, {}, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
              setSelectedProduct(res.data);
            } catch (e) {
              console.error('Failed to like product', e);
            }
          }}
          currentUserId={currentUserId}
        />
      )}

      {selectedVenue && (
        <VenueDetailModal
          venue={selectedVenue}
          token={token}
          onClose={() => setSelectedVenue(null)}
        />
      )}
    </div>
  );
}
