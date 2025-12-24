// Payment flow removed; no modal used currently
// Payment modal removed
// Payment removed: proceed directly
// Payment flow removed
{
  /* Payment flow removed */
}
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  ShoppingBag,
  Heart,
  Sparkles,
  Plus,
  Filter,
  X,
  Star,
  Package,
  Stethoscope,
  Dumbbell,
  ArrowRight,
  Clock,
  DollarSign,
  Phone,
  Mail,
  Tag,
  Search,
  ChevronLeft,
  Image as ImageIcon,
} from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { API_URL } from '../config/api';
import ServiceDetailModal from '../components/ServiceDetailModal';
import ProductDetailModal from '../components/ProductDetailModal';
import EventDetailModal from '../components/EventDetailModal';
import EventParticipantsModal from '../components/EventParticipantsModal';
import NotificationToast from '../components/NotificationToast';

dayjs.extend(relativeTime);

// Helpers for logging, errors, and in-flight guards
export type InFlightMap = Record<string, boolean>;

const safeLog = (...args: any[]) => {
  if (import.meta.env?.DEV) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as any)?.message ||
      (error.response?.data as any)?.error ||
      error.message ||
      'An unexpected error occurred'
    );
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
};

const startAction = (
  map: InFlightMap,
  setMap: React.Dispatch<React.SetStateAction<InFlightMap>>,
  id: string,
): boolean => {
  if (map[id]) return false;
  setMap((prev) => ({ ...prev, [id]: true }));
  return true;
};

const finishAction = (setMap: React.Dispatch<React.SetStateAction<InFlightMap>>, id: string) => {
  setMap((prev) => {
    const next = { ...prev };
    delete next[id];
    return next;
  });
};

type CategoryType = 'sports' | 'services' | 'marketplace' | 'other' | null;

interface Event {
  _id: string;
  title: string;
  sport: string;
  description: string;
  date?: string;
  startDate?: string;
  time: string;
  location: any;
  maxParticipants?: number;
  participants: any[];
  organizer: {
    _id: string;
    username: string;
    avatar?: string;
  };
  requiresApproval: boolean;
  cost?: number;
  skillLevel?: string;
  image?: string;
  pricing?: {
    type: string;
    amount: number;
    currency: string;
    paymentInstructions?: string;
  };
  capacity?: {
    max?: number;
    current?: number;
  };
}

interface Service {
  _id: string;
  name: string;
  description: string;
  category: string;
  sport?: string;
  pricing: {
    type: string;
    amount: number;
  };
  location: {
    type: string;
    city?: string;
    address?: string;
  };
  provider: {
    _id: string;
    username: string;
    avatar?: string;
  };
  qualifications?: string[];
  experience?: string;
  images?: string[];
  duration?: {
    value: number;
    unit: string;
  };
  requirements?: string[];
  included?: string[];
  views?: number;
  likes?: string[];
}

interface MarketplaceItem {
  _id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  condition: string;
  images: string[];
  location?: string;
  seller: {
    _id: string;
    username: string;
    avatar?: string;
  };
  likes: string[];
  views: number;
  status: string;
  createdAt: string;
}

interface DiscoverProps {
  token: string | null;
  onViewProfile?: (user: any) => void;
  onStartConversation: (userId: string) => void;
}

export default function Discover({ token, onViewProfile, onStartConversation }: DiscoverProps) {
  const [activeCategory, setActiveCategory] = useState<CategoryType>(() => {
    const saved = localStorage.getItem('auralink-discover-category');
    return saved ? (saved as CategoryType) : null;
  });
  const [events, setEvents] = useState<Event[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [otherEvents, setOtherEvents] = useState<any[]>([]);
  const [createOtherOpen, setCreateOtherOpen] = useState(false);
  const [newOther, setNewOther] = useState({
    title: '',
    caption: '',
    imageUrl: '',
    location: '',
    tags: 'event',
  });
  const [uploadingOtherImage, setUploadingOtherImage] = useState(false);
  const [selectedOther, setSelectedOther] = useState<any | null>(null);
  const [joiningOther, setJoiningOther] = useState<InFlightMap>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem('auralink-discover-search') || '',
  );
  const [filterCategory, setFilterCategory] = useState(
    () => localStorage.getItem('auralink-discover-filter') || '',
  );
  const [selectedSport, setSelectedSport] = useState(
    () => localStorage.getItem('auralink-discover-sport') || 'All Sports',
  );
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceItem | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [participantsModalEvent, setParticipantsModalEvent] = useState<Event | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  // In-flight guards to prevent duplicate clicks
  const [joiningEvent, setJoiningEvent] = useState<InFlightMap>({});
  const [likingItem, setLikingItem] = useState<InFlightMap>({});
  const [likingService, setLikingService] = useState<InFlightMap>({});

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (activeCategory === 'sports') {
      fetchEvents();
    } else if (activeCategory === 'services') {
      fetchServices();
    } else if (activeCategory === 'marketplace') {
      fetchMarketplaceItems();
    } else if (activeCategory === 'other') {
      fetchOtherEvents();
    }
  }, [activeCategory, selectedSport, filterCategory]);

  // Persist Discover UI selections across refresh
  useEffect(() => {
    localStorage.setItem('auralink-discover-category', activeCategory ?? '');
  }, [activeCategory]);
  useEffect(() => {
    localStorage.setItem('auralink-discover-sport', selectedSport);
  }, [selectedSport]);
  useEffect(() => {
    localStorage.setItem('auralink-discover-filter', filterCategory);
  }, [filterCategory]);
  useEffect(() => {
    localStorage.setItem('auralink-discover-search', searchTerm);
  }, [searchTerm]);

  // Auto-open highlighted event when arriving from profile or search
  useEffect(() => {
    try {
      if (activeCategory === 'sports' && events.length > 0) {
        const id = localStorage.getItem('auralink-highlight-event');
        if (id) {
          openEventDetails(id);
          localStorage.removeItem('auralink-highlight-event');
        }
      }
    } catch {}
  }, [activeCategory, events.length]);

  // Auto-open highlighted other event post when arriving from search
  useEffect(() => {
    try {
      if (activeCategory === 'other' && otherEvents.length > 0) {
        const id = localStorage.getItem('auralink-highlight-post');
        if (id) {
          openOtherDetails(id);
          localStorage.removeItem('auralink-highlight-post');
        }
      }
    } catch {}
  }, [activeCategory, otherEvents.length]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const sport =
        selectedSport === 'All Sports' || selectedSport === 'Other Events' ? '' : selectedSport;
      if (sport) {
        params.append('category', 'sports');
        params.append('sport', sport);
      } else if (selectedSport === 'Other Events') {
        params.append('category', 'other');
      }
      if (searchTerm && searchTerm.trim()) params.append('search', searchTerm.trim());
      const response = await axios.get(`${API_URL}/events?${params.toString()}`);
      setEvents(response.data.events || response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchServices = async () => {
    setLoading(true);
    try {
      const params = filterCategory ? `?category=${filterCategory}` : '';
      const response = await axios.get(`${API_URL}/services${params}`);
      setServices(response.data.services || response.data);
    } catch (error) {
      console.error('Error fetching services:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarketplaceItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterCategory) params.append('category', filterCategory);
      if (searchTerm) params.append('search', searchTerm);
      const response = await axios.get(`${API_URL}/marketplace?${params}`);
      setMarketplaceItems(response.data.items || response.data);
    } catch (error) {
      console.error('Error fetching marketplace items:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOtherEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const posts = response.data.posts || response.data || [];
      const filtered = (posts || []).filter(
        (p: any) => Array.isArray(p.tags) && p.tags.some((t: string) => /event/i.test(t)),
      );
      setOtherEvents(filtered);
    } catch (error) {
      console.error('Error fetching other events (posts):', error);
      setOtherEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOtherImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert('Image must be under 10MB');
      return;
    }
    try {
      setUploadingOtherImage(true);
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API_URL}/files/upload`, formData, {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          'Content-Type': 'multipart/form-data',
        },
      });
      setNewOther((p) => ({ ...p, imageUrl: res.data.url }));
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Failed to upload image');
    } finally {
      setUploadingOtherImage(false);
    }
  };

  const handleCreateOther = async () => {
    if (!token) {
      alert('Please log in to create an event post');
      return;
    }
    if (!newOther.title.trim() && !newOther.caption.trim() && !newOther.imageUrl) {
      alert('Please add a caption or image');
      return;
    }
    try {
      const tags = (newOther.tags || '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await axios.post(
        `${API_URL}/posts`,
        {
          title: newOther.title || '',
          caption: newOther.caption,
          imageUrl: newOther.imageUrl,
          tags,
          location: newOther.location,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setOtherEvents((prev) => [res.data, ...prev]);
      setNewOther({ title: '', caption: '', imageUrl: '', location: '', tags: 'event' });
      setCreateOtherOpen(false);
    } catch (err) {
      console.error('Failed to create event post:', err);
      alert('Failed to create event post');
    }
  };

  const openOtherDetails = async (postId: string) => {
    try {
      const resp = await axios.get(`${API_URL}/posts/${postId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setSelectedOther(resp.data);
    } catch (e) {
      console.error('Failed to fetch post details, falling back to cached post:', e);
      const fallback = otherEvents.find((p) => p._id === postId) || null;
      setSelectedOther(fallback);
    }
  };

  const handleJoinOther = async (postId: string) => {
    if (!token) {
      alert('Please log in to join');
      return;
    }
    const post = otherEvents.find((p) => p._id === postId) || selectedOther;
    const title = post && (post.title || post.caption) ? post.title || post.caption : 'this event';
    const confirmJoin = window.confirm(`Do you want to join ${title}?`);
    if (!confirmJoin) return;
    if (joiningOther[postId]) return;
    setJoiningOther((m) => ({ ...m, [postId]: true }));
    try {
      const resp = await axios.post(
        `${API_URL}/posts/${postId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated = resp.data.post || resp.data;
      setOtherEvents((list) => list.map((p) => (p._id === postId ? updated : p)));
      if (selectedOther && selectedOther._id === postId) setSelectedOther(updated);
    } catch (err) {
      console.error('Join other event failed:', err);
      alert('Failed to join');
    } finally {
      setJoiningOther((m) => {
        const n = { ...m };
        delete n[postId];
        return n;
      });
    }
  };

  const handleLeaveOther = async (postId: string) => {
    if (!token) {
      alert('Please log in to leave');
      return;
    }
    if (joiningOther[postId]) return;
    setJoiningOther((m) => ({ ...m, [postId]: true }));
    try {
      const resp = await axios.post(
        `${API_URL}/posts/${postId}/leave`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const updated = resp.data.post || resp.data;
      setOtherEvents((list) => list.map((p) => (p._id === postId ? updated : p)));
      if (selectedOther && selectedOther._id === postId) setSelectedOther(updated);
    } catch (err) {
      console.error('Leave other event failed:', err);
      alert('Failed to leave');
    } finally {
      setJoiningOther((m) => {
        const n = { ...m };
        delete n[postId];
        return n;
      });
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to join events', type: 'warning' });
      return;
    }

    const ev = events.find((e) => e._id === eventId) || selectedEvent;
    const title = ev?.title ? ev.title : 'this event';
    const confirmJoin = window.confirm(`Do you want to join ${title}?`);
    if (!confirmJoin) return;

    if (!startAction(joiningEvent, setJoiningEvent, eventId)) return;

    try {
      safeLog('[Discover] API_URL:', API_URL);
      safeLog(
        '[Discover] Auth token present (first 8 chars):',
        token ? token.slice(0, 8) : 'no-token',
      );
      safeLog('[Discover] === JOIN EVENT START ===');
      safeLog('[Discover] Event ID:', eventId);

      // Find the event to check if it's paid
      const event = events.find((e) => e._id === eventId) || selectedEvent;
      safeLog('[Discover] Event found:', event);
      // Paid flow removed; pricing logs no longer relevant

      // Proceed directly (all events are free now)
      const response = await axios.post(
        `${API_URL}/events/${eventId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      safeLog('[Discover] Join event response:', response.data);
      // Show success message with proper notification
      const message = response.data.message || 'Successfully joined event!';
      setNotification({ message, type: 'success' });

      // Optimistically update local events list for immediate joins
      setEvents((prev) =>
        prev.map((ev) => {
          if (ev._id !== eventId) return ev;
          const already = (ev.participants || []).some(
            (p: any) => p?._id === currentUser._id || p === currentUser._id,
          );
          if (already) return ev;
          return { ...ev, participants: [...(ev.participants || []), currentUser] } as any;
        }),
      );

      // Background refresh
      fetchEvents();

      // Update selected event if modal is open
      if (selectedEvent && selectedEvent._id === eventId) {
        const already = (selectedEvent.participants || []).some(
          (p: any) => p?._id === currentUser._id || p === currentUser._id,
        );
        if (!already) {
          setSelectedEvent({
            ...selectedEvent,
            participants: [...(selectedEvent.participants || []), currentUser],
          } as any);
        }
        try {
          const updatedEvent = await axios.get(`${API_URL}/events/${eventId}`);
          setSelectedEvent(updatedEvent.data);
        } catch (err) {
          console.error('Failed to refresh event details:', err);
        }
      }
    } catch (error: any) {
      safeLog('[Discover] Join event error:', error);
      safeLog(
        '[Discover] Join error response:',
        error.response && { status: error.response.status, data: error.response.data },
      );
      setNotification({ message: getApiErrorMessage(error), type: 'error' });
    } finally {
      finishAction(setJoiningEvent, eventId);
    }
  };

  // Payment flow removed entirely

  // Ensure we display fully populated event (participants with usernames)
  const openEventDetails = async (eventId: string) => {
    const cacheKey = `auralink-cache-event:${eventId}`;
    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const obj = JSON.parse(cachedRaw);
        if (obj && obj.ts && Date.now() - obj.ts < 5 * 60 * 1000) {
          setSelectedEvent(obj.data);
        }
      }
    } catch {}
    try {
      const resp = await axios.get(`${API_URL}/events/${eventId}`, { timeout: 8000 });
      setSelectedEvent(resp.data);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: resp.data }));
      } catch {}
    } catch (e) {
      console.error('[Discover] Failed to fetch event details, falling back to cached event:', e);
      const fallback = events.find((e) => e._id === eventId) || null;
      setSelectedEvent(fallback as any);
    }
  };

  const handleApproveRequest = async (eventId: string, requestId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to manage requests', type: 'warning' });
      return;
    }

    try {
      safeLog('[Discover] Approving request:', { eventId, requestId });
      const response = await axios.post(
        `${API_URL}/events/${eventId}/approve-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      safeLog('[Discover] Approve response:', response.data);
      setNotification({
        message: response.data.message || 'Request approved! Participant added to event.',
        type: 'success',
      });

      // Refresh event data
      await fetchEvents();

      // Update participants modal with fresh data
      if (participantsModalEvent && participantsModalEvent._id === eventId) {
        try {
          const updatedEventResponse = await axios.get(`${API_URL}/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          safeLog('[Discover] Updated event data:', updatedEventResponse.data);
          setParticipantsModalEvent(updatedEventResponse.data);
        } catch (err) {
          console.error('[Discover] Failed to fetch updated event:', err);
        }
      }

      // Update selected event if detail modal is open
      if (selectedEvent && selectedEvent._id === eventId) {
        try {
          const updatedEventResponse = await axios.get(`${API_URL}/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSelectedEvent(updatedEventResponse.data);
        } catch (err) {
          console.error('[Discover] Failed to update selected event:', err);
        }
      }
    } catch (error: any) {
      console.error('[Discover] Approve request error:', error);
      setNotification({
        message: getApiErrorMessage(error),
        type: 'error',
      });
    }
  };

  const handleRejectRequest = async (eventId: string, requestId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to manage requests', type: 'warning' });
      return;
    }

    try {
      safeLog('[Discover] Rejecting request:', { eventId, requestId });
      const response = await axios.post(
        `${API_URL}/events/${eventId}/reject-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      safeLog('[Discover] Reject response:', response.data);
      setNotification({
        message: response.data.message || 'Request rejected',
        type: 'info',
      });

      // Refresh event data
      await fetchEvents();

      // Update participants modal with fresh data
      if (participantsModalEvent && participantsModalEvent._id === eventId) {
        try {
          const updatedEventResponse = await axios.get(`${API_URL}/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          safeLog('[Discover] Updated event data after rejection:', updatedEventResponse.data);
          setParticipantsModalEvent(updatedEventResponse.data);
        } catch (err) {
          console.error('[Discover] Failed to fetch updated event:', err);
        }
      }

      // Update selected event if detail modal is open
      if (selectedEvent && selectedEvent._id === eventId) {
        try {
          const updatedEventResponse = await axios.get(`${API_URL}/events/${eventId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setSelectedEvent(updatedEventResponse.data);
        } catch (err) {
          console.error('[Discover] Failed to update selected event:', err);
        }
      }
    } catch (error: any) {
      console.error('[Discover] Reject request error:', error);
      setNotification({
        message: getApiErrorMessage(error),
        type: 'error',
      });
    }
  };

  const handleLikeItem = async (itemId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to like items', type: 'warning' });
      return;
    }

    if (!startAction(likingItem, setLikingItem, itemId)) return;

    try {
      safeLog('[Discover] Liking item:', itemId);
      const response = await axios.post(
        `${API_URL}/marketplace/${itemId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      safeLog('[Discover] Like response:', response.data);

      await fetchMarketplaceItems();

      // Update the selected product if modal is open
      if (selectedProduct && selectedProduct._id === itemId) {
        const productResponse = await axios.get(`${API_URL}/marketplace/${itemId}`);
        setSelectedProduct(productResponse.data);
      }
    } catch (error: any) {
      safeLog('[Discover] Error liking item:', error);
      setNotification({
        message: getApiErrorMessage(error),
        type: 'error',
      });
    } finally {
      finishAction(setLikingItem, itemId);
    }
  };

  const handleLikeService = async (serviceId: string) => {
    if (!token) {
      setNotification({ message: 'Please log in to like services', type: 'warning' });
      return;
    }

    if (!startAction(likingService, setLikingService, serviceId)) return;

    try {
      safeLog('[Discover] Liking service:', serviceId);
      const response = await axios.post(
        `${API_URL}/services/${serviceId}/like`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      safeLog('[Discover] Like service response:', response.data);

      await fetchServices();

      // Update the selected service if modal is open
      if (selectedService && selectedService._id === serviceId) {
        const serviceResponse = await axios.get(`${API_URL}/services/${serviceId}`);
        setSelectedService(serviceResponse.data);
      }
    } catch (error: any) {
      safeLog('[Discover] Error liking service:', error);
      setNotification({
        message: getApiErrorMessage(error),
        type: 'error',
      });
    } finally {
      finishAction(setLikingService, serviceId);
    }
  };

  const handleMessageUser = async (userId: string) => {
    safeLog('[Discover] handleMessageUser called with userId:', userId);

    if (!token) {
      setNotification({ message: 'Please log in to send messages', type: 'warning' });
      return;
    }

    // Use the callback if available
    if (onStartConversation) {
      safeLog('[Discover] Using onStartConversation callback');
      onStartConversation(userId);
      return;
    }

    // Fallback: create conversation directly
    safeLog('[Discover] Fallback: creating conversation directly');
    try {
      const response = await axios.post(
        `${API_URL}/conversations`,
        { partnerId: userId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const conversation = response.data;
      safeLog('[Discover] Conversation created:', conversation);

      // Store in localStorage
      localStorage.setItem('auralink-active-conversation', JSON.stringify(conversation));
      localStorage.setItem('auralink-in-dm', 'true');

      // Navigate to main view
      setNotification({ message: 'Opening conversation...', type: 'info' });
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error: any) {
      safeLog('[Discover] Error creating conversation:', error);
      setNotification({
        message: getApiErrorMessage(error),
        type: 'error',
      });
    }
  };

  // Hub Landing Page
  if (!activeCategory) {
    return (
      <div className="min-h-screen themed-page">
        <div className="max-w-6xl mx-auto px-4 py-12">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-heading mb-4">
              Discover <span className="text-cyan-300">More</span>
            </h1>
            <p className="text-theme-secondary text-lg">
              Explore sports events, professional services, and marketplace
            </p>
          </div>

          {/* Category Cards (Other Events first) */}
          <div className="grid md:grid-cols-3 gap-8 lg:grid-cols-4">
            {/* Other Events Card */}
            <div
              onClick={() => setActiveCategory('other')}
              className="group cursor-pointer rounded-2xl p-8 border hover:border-blue-500/40 transition-all themed-card"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-blue-400/10 p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Calendar className="w-12 h-12 text-blue-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-heading text-center mb-3">Other Events</h2>
              <p className="text-theme-secondary text-center mb-6">
                See community posts tagged as events
              </p>
              <div className="flex items-center justify-center text-blue-300 group-hover:text-blue-200 transition-colors">
                <span className="font-semibold">Explore</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Sports Events Card */}
            <div
              onClick={() => setActiveCategory('sports')}
              className="group cursor-pointer rounded-2xl p-8 border hover:border-cyan-500/40 transition-all themed-card"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-cyan-400/10 p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-12 h-12 text-cyan-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-heading text-center mb-3">Sports Events</h2>
              <p className="text-theme-secondary text-center mb-6">
                Find and join sports activities, tournaments, and training sessions
              </p>
              <div className="flex items-center justify-center text-cyan-300 group-hover:text-cyan-200 transition-colors">
                <span className="font-semibold">Explore Events</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Services Card */}
            <div
              onClick={() => setActiveCategory('services')}
              className="group cursor-pointer rounded-2xl p-8 border hover:border-violet-500/40 transition-all themed-card"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-violet-400/10 p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <Stethoscope className="w-12 h-12 text-violet-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-heading text-center mb-3">Services</h2>
              <p className="text-theme-secondary text-center mb-6">
                Physiotherapy, massage, nutrition, personal training & more
              </p>
              <div className="flex items-center justify-center text-violet-300 group-hover:text-violet-200 transition-colors">
                <span className="font-semibold">Browse Services</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Marketplace Card */}
            <div
              onClick={() => setActiveCategory('marketplace')}
              className="group cursor-pointer rounded-2xl p-8 border hover:border-amber-500/40 transition-all themed-card"
            >
              <div className="flex justify-center mb-6">
                <div className="bg-amber-400/10 p-6 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                  <ShoppingBag className="w-12 h-12 text-amber-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-heading text-center mb-3">Marketplace</h2>
              <p className="text-theme-secondary text-center mb-6">
                Buy and sell sports equipment, apparel, supplements & gear
              </p>
              <div className="flex items-center justify-center text-amber-300 group-hover:text-amber-200 transition-colors">
                <span className="font-semibold">Shop Now</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Stats removed as requested */}
        </div>
      </div>
    );
  }

  // Sports Events View
  if (activeCategory === 'sports') {
    const sportsList = [
      'All Sports',
      'Football/Soccer',
      'Basketball',
      'Tennis',
      'Running',
      'Swimming',
      'Cycling',
      'Volleyball',
      'Baseball',
      'Other Events',
    ];

    return (
      <div className="min-h-screen themed-page">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button & Header */}
          <div className="mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-theme-secondary hover:text-heading mb-6 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Discover
            </button>
            <h1 className="text-4xl font-bold text-heading mb-2">
              Sports Events <Trophy className="inline w-8 h-8 text-cyan-300 ml-2" />
            </h1>
            <p className="text-theme-secondary">Join sports activities and meet new people</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by title, sport, or location"
                className="w-full pl-10 pr-4 py-2 rounded-xl border"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--card)',
                  color: 'var(--text)',
                }}
              />
            </div>
          </div>

          {/* Sport Filter */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {sportsList.map((sport) => (
              <button
                key={sport}
                onClick={() =>
                  sport === 'Other Events' ? setActiveCategory('other') : setSelectedSport(sport)
                }
                className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-all ${
                  selectedSport === sport
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'border'
                }`}
                style={
                  selectedSport === sport
                    ? undefined
                    : {
                        borderColor: 'var(--border)',
                        background: 'var(--card)',
                        color: 'var(--text)',
                      }
                }
              >
                {sport}
              </button>
            ))}
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="text-center text-theme-secondary py-12">Loading events...</div>
          ) : events.filter((e) => {
              const q = searchTerm.trim().toLowerCase();
              if (!q) return true;
              const loc =
                e.location?.city || e.location?.name || e.location?.address || e.location || '';
              return (
                String(e.title || '')
                  .toLowerCase()
                  .includes(q) ||
                String(e.sport || '')
                  .toLowerCase()
                  .includes(q) ||
                String(loc).toLowerCase().includes(q)
              );
            }).length === 0 ? (
            <div className="text-center text-theme-secondary py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No events found for {selectedSport}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events
                .filter((e) => {
                  const q = searchTerm.trim().toLowerCase();
                  if (!q) return true;
                  const loc =
                    e.location?.city || e.location?.name || e.location?.address || e.location || '';
                  return (
                    String(e.title || '')
                      .toLowerCase()
                      .includes(q) ||
                    String(e.sport || '')
                      .toLowerCase()
                      .includes(q) ||
                    String(loc).toLowerCase().includes(q)
                  );
                })
                .map((event) => (
                  <div
                    key={event._id}
                    onClick={() => openEventDetails(event._id)}
                    className="rounded-xl p-6 hover:scale-105 cursor-pointer border relative"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--card)',
                      color: 'var(--text)',
                    }}
                  >
                    {(() => {
                      const isArchived = !!(event as any).archivedAt;
                      const isPast = !isArchived && dayjs(event.startDate).isBefore(dayjs());
                      return (
                        <>
                          {(isArchived || isPast) && (
                            <div className="absolute top-3 left-3 z-10">
                              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700 dark:bg-gray-900/50 dark:text-gray-400">
                                {isArchived ? 'Past' : 'Past'}
                              </span>
                            </div>
                          )}
                          <div className={isPast || isArchived ? 'opacity-70' : ''}></div>
                        </>
                      );
                    })()}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-heading mb-1">{event.title}</h3>
                        <p className="text-sm text-theme-secondary">{event.sport}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {event.participants?.some(
                          (p: any) => p?._id === currentUser._id || p === currentUser._id,
                        ) && (
                          <div className="bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-600/30">
                            <span className="text-emerald-300 font-semibold text-[11px] tracking-wide">
                              Joined
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <p className="text-theme-secondary text-sm mb-4 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="space-y-2 text-sm text-theme-secondary mb-4">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-theme-secondary" />
                        {dayjs(event.startDate || event.date).format('MMM D, YYYY')} at {event.time}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-2 text-theme-secondary" />
                        {event.location?.city ||
                          event.location?.name ||
                          event.location?.address ||
                          event.location ||
                          'Location TBA'}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-2 text-theme-secondary" />
                        {event.participants?.length || 0}/{event.capacity?.max || 0} participants
                      </div>
                      {event.organizer && (
                        <div className="flex items-center">
                          <img
                            src={
                              event.organizer.avatar ||
                              `https://ui-avatars.com/api/?name=${event.organizer.username}`
                            }
                            alt={event.organizer.username}
                            className="w-5 h-5 rounded-full mr-2 border border-neutral-600"
                          />
                          <span className="text-theme-secondary text-xs">
                            by {event.organizer.username}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoinEvent(event._id);
                      }}
                      disabled={
                        !!(event as any).archivedAt ||
                        event.participants.some(
                          (p: any) => p._id === currentUser._id || p === currentUser._id,
                        ) ||
                        !!joiningEvent[event._id]
                      }
                      className={`w-full py-2 rounded-lg font-semibold transition-all ${
                        (event as any).archivedAt
                          ? 'btn opacity-50 cursor-not-allowed'
                          : event.participants.some(
                                (p: any) => p._id === currentUser._id || p === currentUser._id,
                              )
                            ? 'btn opacity-50 cursor-not-allowed'
                            : 'btn'
                      }`}
                    >
                      {(event as any).archivedAt
                        ? 'Past Event'
                        : event.participants.some(
                              (p: any) => p._id === currentUser._id || p === currentUser._id,
                            )
                          ? 'Joined'
                          : !!joiningEvent[event._id]
                            ? 'Joining...'
                            : 'Join Event'}
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Event Detail Modal */}
          {selectedEvent && (
            <EventDetailModal
              event={selectedEvent}
              onClose={() => setSelectedEvent(null)}
              onJoin={handleJoinEvent}
              onMessage={handleMessageUser}
              onViewProfile={onViewProfile}
              onViewParticipants={async (evt) => {
                try {
                  const resp = await axios.get(`${API_URL}/events/${evt._id}`);
                  setParticipantsModalEvent(resp.data);
                } catch (e) {
                  console.error(
                    '[Discover] Failed to fetch event for participants modal, using passed event:',
                    e,
                  );
                  setParticipantsModalEvent(evt);
                }
                setSelectedEvent(null);
              }}
              currentUserId={currentUser._id}
            />
          )}

          {/* Event Participants Modal */}
          {participantsModalEvent && (
            <EventParticipantsModal
              event={participantsModalEvent}
              onClose={() => setParticipantsModalEvent(null)}
              onMessage={handleMessageUser}
              onViewProfile={onViewProfile}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
              currentUserId={currentUser._id}
              isOrganizer={participantsModalEvent.organizer._id === currentUser._id}
            />
          )}
        </div>
      </div>
    );
  }

  // Services View
  if (activeCategory === 'services') {
    const servicesList = [
      'All',
      'personal-training',
      'group-classes',
      'nutrition',
      'physiotherapy',
      'sports-massage',
      'mental-coaching',
      'technique-analysis',
    ];

    return (
      <div className="min-h-screen themed-page">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button & Header */}
          <div className="mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-theme-secondary hover:text-heading mb-6 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Discover
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-heading mb-2">
                  Services <Stethoscope className="inline w-8 h-8 text-violet-300 ml-2" />
                </h1>
                <p className="text-theme-secondary">
                  Find professional health and training services
                </p>
              </div>
              <button
                onClick={() => (window.location.href = '/#/my-events')}
                className="btn flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Service
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services by name, category, or city"
                className="w-full pl-10 pr-4 py-2 rounded-lg input"
              />
            </div>
          </div>

          {/* Service Filter */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {servicesList.map((category) => (
              <button
                key={category}
                onClick={() => setFilterCategory(category === 'All' ? '' : category)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all capitalize ${
                  (category === 'All' && !filterCategory) || filterCategory === category
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                    : 'themed-card hover:opacity-90'
                }`}
              >
                {category.replace(/-/g, ' ')}
              </button>
            ))}
          </div>

          {/* Services Grid */}
          {loading ? (
            <div className="text-center text-theme-secondary py-12">Loading services...</div>
          ) : services.filter((s) => {
              const q = searchTerm.trim().toLowerCase();
              if (!q) return true;
              const city = s.location?.city || s.location?.address || '';
              return (
                String(s.name || '')
                  .toLowerCase()
                  .includes(q) ||
                String(s.category || '')
                  .toLowerCase()
                  .includes(q) ||
                String(city).toLowerCase().includes(q) ||
                String(s.provider?.username || '')
                  .toLowerCase()
                  .includes(q)
              );
            }).length === 0 ? (
            <div className="text-center text-theme-secondary py-12">
              <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No services found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {services
                .filter((s) => {
                  const q = searchTerm.trim().toLowerCase();
                  if (!q) return true;
                  const city = s.location?.city || s.location?.address || '';
                  return (
                    String(s.name || '')
                      .toLowerCase()
                      .includes(q) ||
                    String(s.category || '')
                      .toLowerCase()
                      .includes(q) ||
                    String(city).toLowerCase().includes(q) ||
                    String(s.provider?.username || '')
                      .toLowerCase()
                      .includes(q)
                  );
                })
                .map((service) => (
                  <div
                    key={service._id}
                    onClick={() => setSelectedService(service)}
                    className="rounded-xl p-6 transition-all cursor-pointer themed-card"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-heading mb-2">{service.name}</h3>
                        <p className="text-sm text-theme-secondary capitalize">
                          {service.category.replace(/-/g, ' ')}
                        </p>
                      </div>
                      <div className="badge">
                        <span className="font-bold">
                          ${service.pricing.amount}
                          <span className="text-xs font-normal">/{service.pricing.type}</span>
                        </span>
                      </div>
                    </div>

                    <p className="text-theme-secondary text-sm mb-4">{service.description}</p>

                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center text-theme-secondary">
                        <MapPin className="w-4 h-4 mr-2 text-theme-secondary" />
                        {service.location?.city ||
                          service.location?.type ||
                          'Location not specified'}
                      </div>
                      {service.experience && (
                        <div className="flex items-center text-theme-secondary">
                          <Star className="w-4 h-4 mr-2 text-yellow-400" />
                          {service.experience}
                        </div>
                      )}
                    </div>

                    {service.qualifications && service.qualifications.length > 0 && (
                      <div className="mb-4">
                        <div className="flex flex-wrap gap-2">
                          {service.qualifications.slice(0, 3).map((qual, idx) => (
                            <span key={idx} className="badge text-xs">
                              {qual}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center text-theme-secondary text-sm mb-4">
                      <img
                        src={
                          service.provider.avatar ||
                          `https://ui-avatars.com/api/?name=${service.provider.username}`
                        }
                        alt={service.provider.username}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <span>{service.provider.username}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessageUser(service.provider._id);
                      }}
                      className="btn w-full text-sm justify-center"
                    >
                      Contact Provider
                    </button>
                  </div>
                ))}
            </div>
          )}

          {/* Service Detail Modal */}
          {selectedService && (
            <ServiceDetailModal
              service={selectedService}
              onClose={() => setSelectedService(null)}
              onMessage={handleMessageUser}
              onLike={handleLikeService}
              currentUserId={currentUser._id}
            />
          )}
        </div>
      </div>
    );
  }

  // Marketplace View
  if (activeCategory === 'marketplace') {
    const categories = [
      'All',
      'Sports Equipment',
      'Apparel & Clothing',
      'Footwear',
      'Accessories',
      'Supplements & Nutrition',
      'Fitness Tech & Wearables',
    ];

    return (
      <div className="min-h-screen themed-page">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button & Header */}
          <div className="mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-theme-secondary hover:text-heading mb-6 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Discover
            </button>
            <h1 className="text-4xl font-bold text-heading mb-2">
              Marketplace <ShoppingBag className="inline w-8 h-8 text-amber-300 ml-2" />
            </h1>
            <p className="text-theme-secondary">Buy and sell sports equipment and gear</p>
          </div>

          {/* Search & Filter */}
          <div className="mb-8 space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-theme-secondary w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchMarketplaceItems()}
                className="w-full input pl-12 pr-4 py-3 rounded-lg"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setFilterCategory(category === 'All' ? '' : category)}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                    (category === 'All' && !filterCategory) || filterCategory === category
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white'
                      : 'themed-card hover:opacity-90'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Marketplace Grid */}
          {loading ? (
            <div className="text-center text-theme-secondary py-12">Loading items...</div>
          ) : marketplaceItems.length === 0 ? (
            <div className="text-center text-theme-secondary py-12">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
              {marketplaceItems.map((item) => (
                <div
                  key={item._id}
                  className="rounded-xl overflow-hidden transition-all hover:scale-105 cursor-pointer themed-card"
                  onClick={() => setSelectedProduct(item)}
                >
                  {/* Item Image */}
                  <div className="relative h-48 themed-card">
                    {item.images && item.images.length > 0 ? (
                      <img
                        src={item.images[0]}
                        alt={item.title}
                        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-16 h-16 text-theme-secondary" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded-full text-xs text-white">
                      {item.condition}
                    </div>
                    {item.images && item.images.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur px-2 py-1 rounded-full text-xs text-white flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {item.images.length}
                      </div>
                    )}
                  </div>

                  {/* Item Details */}
                  <div className="p-4">
                    <h3 className="font-bold text-heading mb-1 line-clamp-2">{item.title}</h3>
                    <p className="text-sm text-theme-secondary mb-2">{item.category}</p>

                    <div className="flex items-center justify-between mb-3">
                      <div className="text-2xl font-bold text-heading">
                        ${item.price}
                        <span className="text-xs text-theme-secondary ml-1">{item.currency}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLikeItem(item._id);
                        }}
                        disabled={!!likingItem[item._id]}
                        className="p-2 themed-card hover:opacity-80 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            item.likes.includes(currentUser._id)
                              ? 'fill-red-500 text-red-500'
                              : 'text-theme-secondary'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center text-xs text-theme-secondary mb-3">
                      <img
                        src={
                          item.seller.avatar ||
                          `https://ui-avatars.com/api/?name=${item.seller.username}`
                        }
                        alt={item.seller.username}
                        className="w-5 h-5 rounded-full mr-2"
                      />
                      <span>{item.seller.username}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMessageUser(item.seller._id);
                      }}
                      className="btn w-full text-sm justify-center"
                    >
                      Contact Seller
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Lightbox Preview */}
          {previewImage && (
            <div
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
              onClick={() => setPreviewImage(null)}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <img
                src={previewImage}
                alt="Preview"
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* Product Detail Modal */}
          {selectedProduct && (
            <ProductDetailModal
              product={selectedProduct}
              onClose={() => setSelectedProduct(null)}
              onLike={handleLikeItem}
              onMessage={handleMessageUser}
              currentUserId={currentUser._id}
            />
          )}

          {/* Payment flow removed */}

          {/* Notification Toast */}
          {notification && (
            <NotificationToast
              message={notification.message}
              type={notification.type}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
      </div>
    );
  }

  // Other Events View (posts tagged as events)
  if (activeCategory === 'other') {
    return (
      <div className="min-h-screen themed-page">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Back Button & Header */}
          <div className="mb-8">
            <button
              onClick={() => setActiveCategory(null)}
              className="flex items-center text-theme-secondary hover:text-heading mb-6 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back to Discover
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-heading mb-2">
                  Other Events <Calendar className="inline w-8 h-8 text-blue-300 ml-2" />
                </h1>
                <p className="text-theme-secondary">
                  Community posts related to events and announcements
                </p>
              </div>
              <button
                onClick={() => setCreateOtherOpen((v) => !v)}
                className="btn flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create Other Event
              </button>
            </div>
          </div>

          {/* Create Other Event Form */}
          {createOtherOpen && (
            <div className="rounded-2xl p-6 mb-6 themed-card">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-theme-secondary">Event Name</label>
                  <input
                    value={newOther.title}
                    onChange={(e) => setNewOther((p) => ({ ...p, title: e.target.value }))}
                    className="w-full mt-1 rounded-lg input"
                    placeholder="e.g. Community Fundraiser"
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-secondary">Caption</label>
                  <textarea
                    value={newOther.caption}
                    onChange={(e) => setNewOther((p) => ({ ...p, caption: e.target.value }))}
                    className="w-full mt-1 rounded-lg input min-h-24"
                    placeholder="Describe your event or announcement"
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-secondary">Location (optional)</label>
                  <input
                    value={newOther.location}
                    onChange={(e) => setNewOther((p) => ({ ...p, location: e.target.value }))}
                    className="w-full mt-1 rounded-lg input"
                    placeholder="City or venue"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="text-sm text-theme-secondary">Tags</label>
                  <input
                    value={newOther.tags}
                    onChange={(e) => setNewOther((p) => ({ ...p, tags: e.target.value }))}
                    className="w-full mt-1 rounded-lg input"
                    placeholder="Comma-separated tags (default: event)"
                  />
                  {/* Tag chips preview (derived, not hard-coded) */}
                  {String(newOther.tags || '').trim() && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {String(newOther.tags)
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean)
                        .slice(0, 8)
                        .map((t, idx) => (
                          <span key={idx} className="badge text-xs">
                            {t}
                          </span>
                        ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm text-theme-secondary">Image</label>
                  <div className="flex items-center gap-3 mt-1">
                    <input
                      id="other-image-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleOtherImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="other-image-upload"
                      className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium cursor-pointer inline-flex items-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" /> Upload Image
                    </label>
                    {uploadingOtherImage && (
                      <span className="text-xs text-theme-secondary">Uploading...</span>
                    )}
                    {newOther.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setNewOther((p) => ({ ...p, imageUrl: '' }))}
                        className="px-2 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  {newOther.imageUrl && (
                    <div
                      className="mt-3 rounded-lg overflow-hidden border"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <img
                        src={newOther.imageUrl}
                        alt="Preview"
                        className="w-full h-40 object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  className="btn"
                  onClick={handleCreateOther}
                  disabled={
                    uploadingOtherImage ||
                    !(newOther.title.trim() || newOther.caption.trim() || newOther.imageUrl)
                  }
                >
                  {uploadingOtherImage ? 'Uploading...' : 'Publish'}
                </button>
                <button className="btn" onClick={() => setCreateOtherOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-theme-secondary" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search posts by caption, tag, or location"
                className="w-full pl-10 pr-4 py-2 rounded-lg input"
              />
            </div>
          </div>

          {/* Posts Grid */}
          {loading ? (
            <div className="text-center text-theme-secondary py-12">Loading posts...</div>
          ) : otherEvents.filter((p) => {
              const q = searchTerm.trim().toLowerCase();
              if (!q) return true;
              const tagStr = Array.isArray(p.tags) ? p.tags.join(' ') : '';
              return (
                String(p.caption || '')
                  .toLowerCase()
                  .includes(q) ||
                String(tagStr).toLowerCase().includes(q) ||
                String(p.location || '')
                  .toLowerCase()
                  .includes(q)
              );
            }).length === 0 ? (
            <div className="text-center text-theme-secondary py-12">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No posts found</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherEvents
                .filter((p) => {
                  const q = searchTerm.trim().toLowerCase();
                  if (!q) return true;
                  const tagStr = Array.isArray(p.tags) ? p.tags.join(' ') : '';
                  return (
                    String(p.title || '')
                      .toLowerCase()
                      .includes(q) ||
                    String(p.caption || '')
                      .toLowerCase()
                      .includes(q) ||
                    String(tagStr).toLowerCase().includes(q) ||
                    String(p.location || '')
                      .toLowerCase()
                      .includes(q)
                  );
                })
                .map((post) => (
                  <div
                    key={post._id}
                    className="rounded-xl overflow-hidden themed-card cursor-pointer"
                    onClick={() => openOtherDetails(post._id)}
                  >
                    {/* Poster Image */}
                    {post.imageUrl && (
                      <div className="w-full h-48 sm:h-56 md:h-64 bg-black/10">
                        <img
                          src={post.imageUrl}
                          alt={post.title || post.caption || 'Event'}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="text-base sm:text-lg font-bold text-heading mb-2 line-clamp-2">
                        {post.title || post.caption || 'Untitled'}
                      </h3>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-theme-secondary flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>{post.participants?.length || 0} joined</span>
                        </div>
                        {(post.participants || []).some(
                          (p: any) => p?._id === currentUser._id || p === currentUser._id,
                        ) ? (
                          <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-600/30 text-emerald-300">
                            Joined
                          </span>
                        ) : null}
                      </div>
                      {Array.isArray(post.tags) && post.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {post.tags.slice(0, 4).map((t: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-full text-xs text-cyan-600 dark:text-cyan-400"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              {t}
                            </span>
                          ))}
                          {post.tags.length > 4 && (
                            <span
                              className="px-2 py-0.5 rounded-full text-xs text-theme-secondary"
                              style={{ border: '1px solid var(--border)' }}
                            >
                              …
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center text-xs text-theme-secondary mb-3">
                        <img
                          src={
                            post.author?.avatar ||
                            `https://ui-avatars.com/api/?name=${post.author?.username || 'User'}`
                          }
                          alt={post.author?.username || 'User'}
                          className="w-5 h-5 rounded-full mr-2 border"
                        />
                        <span>{post.author?.username || 'Unknown'}</span>
                        <span className="mx-2">•</span>
                        <span>{dayjs(post.createdAt).fromNow()}</span>
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {(post.participants || []).some(
                          (p: any) => p?._id === currentUser._id || p === currentUser._id,
                        ) ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleLeaveOther(post._id);
                            }}
                            disabled={!!joiningOther[post._id]}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium w-full"
                          >
                            Leave
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleJoinOther(post._id);
                            }}
                            disabled={!!joiningOther[post._id]}
                            className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium w-full"
                          >
                            Join
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
          {/* Other Event Detail Modal */}
          {selectedOther && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setSelectedOther(null)}
              />
              <div className="relative w-full max-w-2xl mx-3 sm:mx-4 mt-14 mb-10 rounded-2xl themed-card overflow-hidden shadow-2xl">
                {selectedOther.imageUrl && (
                  <div className="w-full h-40 sm:h-48">
                    <img
                      src={selectedOther.imageUrl}
                      alt={selectedOther.title || selectedOther.caption || 'Event'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4 sm:p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-heading line-clamp-2">
                      {selectedOther.title || selectedOther.caption || 'Untitled'}
                    </h2>
                    <button
                      onClick={() => setSelectedOther(null)}
                      className="px-3 py-1 rounded-lg themed-card text-sm"
                    >
                      Close
                    </button>
                  </div>
                  {selectedOther.location && (
                    <div className="text-sm text-theme-secondary mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedOther.location}</span>
                    </div>
                  )}
                  {Array.isArray(selectedOther.tags) && selectedOther.tags.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {selectedOther.tags.slice(0, 6).map((t: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-xs text-cyan-600 dark:text-cyan-400"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          {t}
                        </span>
                      ))}
                      {selectedOther.tags.length > 6 && (
                        <span
                          className="px-2 py-0.5 rounded-full text-xs text-theme-secondary"
                          style={{ border: '1px solid var(--border)' }}
                        >
                          …
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-theme-secondary whitespace-pre-line mb-4">
                    {selectedOther.caption}
                  </p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xs text-theme-secondary flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>{selectedOther.participants?.length || 0} joined</span>
                    </div>
                    {(selectedOther.participants || []).some(
                      (p: any) => p?._id === currentUser._id || p === currentUser._id,
                    ) ? (
                      <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 border border-emerald-600/30 text-emerald-300">
                        Joined
                      </span>
                    ) : null}
                  </div>
                  {/* Author Info (uniform with Sports Events) */}
                  {selectedOther.author && (
                    <div className="bg-white/5 backdrop-blur rounded-xl p-4 mb-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div
                          className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded-lg p-2 transition-colors"
                          onClick={() => onViewProfile && onViewProfile(selectedOther.author._id)}
                        >
                          <img
                            src={
                              selectedOther.author.avatar ||
                              `https://ui-avatars.com/api/?name=${selectedOther.author.username || 'User'}`
                            }
                            alt={selectedOther.author.username || 'User'}
                            className="w-10 h-10 rounded-full border"
                          />
                          <div>
                            <p className="text-heading font-semibold hover:text-cyan-400 transition-colors">
                              {selectedOther.author.username || 'User'}
                            </p>
                            <p className="text-theme-secondary text-sm">
                              Post Author · Click to view profile
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            onStartConversation && onStartConversation(selectedOther.author._id)
                          }
                          className="btn text-sm w-full sm:w-auto mt-2 sm:mt-0"
                        >
                          Message Author
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    {(selectedOther.participants || []).some(
                      (p: any) => p?._id === currentUser._id || p === currentUser._id,
                    ) ? (
                      <button
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium"
                        disabled={!!joiningOther[selectedOther._id]}
                        onClick={() => handleLeaveOther(selectedOther._id)}
                      >
                        Leave
                      </button>
                    ) : (
                      <button
                        className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium"
                        disabled={!!joiningOther[selectedOther._id]}
                        onClick={() => handleJoinOther(selectedOther._id)}
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
