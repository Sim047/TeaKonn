// frontend/src/pages/MyEvents.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import dayjs from 'dayjs';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Edit,
  Trash2,
  Plus,
  AlertCircle,
  DollarSign,
  Trophy,
  Stethoscope,
  Star,
  Package,
  Search,
  MessageSquare,
  Eye,
  Truck,
} from 'lucide-react';
import CreateEventModal from '../components/CreateEventModal';
import CreateServiceModal from '../components/CreateServiceModal';
import CreateProductModal from '../components/CreateProductModal';
import EventParticipantsModal from '../components/EventParticipantsModal';
import NotificationToast from '../components/NotificationToast';

const API = API_URL.replace(/\/api$/, '');

type TabType = 'events' | 'services' | 'products';

type NavigateFn = (view: string) => void;

export default function MyEvents({
  token,
  onNavigate,
}: {
  token: string;
  onNavigate?: NavigateFn;
}) {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('auralink-my-activities-tab') as TabType | null;
    return (saved as TabType) || 'events';
  });
  const [hideInactiveEvents, setHideInactiveEvents] = useState<boolean>(true);
  const [eventsCreated, setEventsCreated] = useState<any[]>([]);
  const [eventsJoined, setEventsJoined] = useState<any[]>([]);
  const [eventsTab, setEventsTab] = useState<'organizing' | 'joined'>('organizing');
  const [eventSearch, setEventSearch] = useState<string>('');
  const [services, setServices] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState<string>('');
  const [productSearch, setProductSearch] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createServiceModalOpen, setCreateServiceModalOpen] = useState(false);
  const [createProductModalOpen, setCreateProductModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editingService, setEditingService] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [participantsModalEvent, setParticipantsModalEvent] = useState<any>(null);
  const [otherEvents, setOtherEvents] = useState<any[]>([]);
  const [loadingOther, setLoadingOther] = useState<boolean>(false);
  const [createOtherOpen, setCreateOtherOpen] = useState<boolean>(false);
  const [newOther, setNewOther] = useState<{
    title: string;
    caption: string;
    location: string;
    tags: string;
    imageUrl: string;
  }>({ title: '', caption: '', location: '', tags: 'event', imageUrl: '' });
  const [uploadingOtherImage, setUploadingOtherImage] = useState<boolean>(false);
  const [otherSearchTerm, setOtherSearchTerm] = useState<string>('');
  const [otherListOpen, setOtherListOpen] = useState<boolean>(true);
  const [organizingListOpen, setOrganizingListOpen] = useState<boolean>(true);
  const [joinedListOpen, setJoinedListOpen] = useState<boolean>(true);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (!token) return;
    loadMyEventsAll();
    loadMyServices();
    loadMyProducts();
    loadOtherEvents();
    // Consume default tab hint provided by dashboard
    const hint = localStorage.getItem('auralink-my-activities-tab') as TabType | null;
    if (hint) {
      setActiveTab(hint);
      localStorage.removeItem('auralink-my-activities-tab');
    }
  }, [token]);

  async function loadMyEventsAll() {
    try {
      setLoading(true);
      const [createdRes, joinedRes] = await Promise.all([
        axios.get(`${API}/api/events/my/created`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API}/api/events/my/joined`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setEventsCreated(createdRes.data.events || []);
      setEventsJoined(joinedRes.data.events || []);
    } catch (err) {
      console.error('Load my events error:', err);
    } finally {
      setLoading(false);
    }
  }

  function matchesEventSearch(ev: any): boolean {
    const q = eventSearch.trim().toLowerCase();
    if (!q) return true;
    const fields = [
      ev?.title,
      ev?.sport,
      ev?.location?.city,
      ev?.location?.address,
    ].map((s: any) => String(s || '').toLowerCase());
    return fields.some((f: string) => f.includes(q));
  }

  function matchesServiceSearch(service: any): boolean {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return true;
    const fields = [
      service?.name,
      service?.sport,
      service?.category,
      service?.description,
      service?.location?.city,
      service?.location?.type,
    ].map((s: any) => String(s || '').toLowerCase());
    return fields.some((f: string) => f.includes(q));
  }

  function matchesProductSearch(product: any): boolean {
    const q = productSearch.trim().toLowerCase();
    if (!q) return true;
    const fields = [
      product?.title,
      product?.category,
      product?.description,
      product?.location,
      Array.isArray(product?.tags) ? product.tags.join(' ') : '',
      product?.condition,
    ].map((s: any) => String(s || '').toLowerCase());
    return fields.some((f: string) => f.includes(q));
  }


  async function loadOtherEvents() {
    try {
      setLoadingOther(true);
      const res = await axios.get(`${API}/api/posts`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const posts = res.data.posts || res.data || [];
      const filtered = (posts || []).filter(
        (p: any) => Array.isArray(p.tags) && p.tags.some((t: string) => /event/i.test(t)),
      );
      setOtherEvents(filtered);
    } catch (err) {
      console.error('Load other events error:', err);
      setOtherEvents([]);
    } finally {
      setLoadingOther(false);
    }
  }

  async function handleOtherImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
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
      const res = await axios.post(`${API}/files/upload`, formData, {
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
  }

  async function handleCreateOther() {
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
        `${API}/posts`,
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
      setToast({ message: 'Other event published', type: 'success' });
    } catch (err) {
      console.error('Failed to create event post:', err);
      setToast({ message: 'Failed to publish event', type: 'error' });
    }
  }

  async function loadMyServices() {
    try {
      const res = await axios.get(`${API}/api/services/my/created`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(res.data.services || []);
    } catch (err) {
      console.error('Load my services error:', err);
    }
  }

  async function loadMyProducts() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await axios.get(`${API}/api/marketplace/user/${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data || []);
    } catch (err) {
      console.error('Load my products error:', err);
    }
  }

  async function handleDelete(eventId: string) {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      setDeletingId(eventId);
      await axios.delete(`${API}/api/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEventsCreated((prev) => prev.filter((e) => e._id !== eventId));
      setEventsJoined((prev) => prev.filter((e) => e._id !== eventId));
      // removed pending list; only created/joined are kept
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete event');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteService(serviceId: string) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      setDeletingId(serviceId);
      await axios.delete(`${API}/api/services/${serviceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setServices(services.filter((s) => s._id !== serviceId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete service');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      setDeletingId(productId);
      await axios.delete(`${API}/api/marketplace/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(products.filter((p) => p._id !== productId));
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  }

  function handleEdit(event: any) {
    setEditingEvent(event);
    setCreateModalOpen(true);
  }

  function handleEditService(service: any) {
    setEditingService(service);
    setCreateServiceModalOpen(true);
  }

  function handleCreateSuccess() {
    loadMyEventsAll();
    setEditingEvent(null);
  }

  function handleServiceCreateSuccess() {
    loadMyServices();
    setEditingService(null);
  }

  function handleEditProduct(product: any) {
    setEditingProduct(product);
    setCreateProductModalOpen(true);
  }

  function handleProductCreateSuccess() {
    loadMyProducts();
    setEditingProduct(null);
  }

  async function handleApproveRequest(eventId: string, requestId: string) {
    try {
      const res = await axios.post(
        `${API}/api/events/${eventId}/approve-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert(res.data.message || 'Request approved!');
      loadMyEventsAll();
      if (participantsModalEvent && participantsModalEvent._id === eventId) {
        const updatedEvent = await axios.get(`${API}/api/events/${eventId}`);
        setParticipantsModalEvent(updatedEvent.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve request');
    }
  }

  async function handleRejectRequest(eventId: string, requestId: string) {
    try {
      const res = await axios.post(
        `${API}/api/events/${eventId}/reject-request/${requestId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert(res.data.message || 'Request rejected!');
      loadMyEventsAll();
      if (participantsModalEvent && participantsModalEvent._id === eventId) {
        const updatedEvent = await axios.get(`${API}/api/events/${eventId}`);
        setParticipantsModalEvent(updatedEvent.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reject request');
    }
  }

  async function handleLeave(eventId: string) {
    if (!confirm('Leave this event? You will be removed from participants.')) return;
    try {
      setDeletingId(eventId);
      await axios.post(`${API}/api/events/${eventId}/leave`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEventsJoined((prev) => prev.filter((e) => e._id !== eventId));
      setToast({ message: 'Left event', type: 'success' });
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to leave event');
    } finally {
      setDeletingId(null);
    }
  }

  function handleMessageUser(userId: string) {
    // TODO: Implement messaging - integrate with your chat system
    console.log('Message user:', userId);
    alert('Messaging feature coming soon!');
  }

  function handleViewProfile(userId: string) {
    // TODO: Implement profile viewing
    console.log('View profile:', userId);
    alert('Profile viewing coming soon!');
  }

  if (loading) {
    return (
      <div className="min-h-screen themed-page p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 rounded w-1/3" style={{ background: 'var(--muted)' }}></div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl themed-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {toast && (
          <NotificationToast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-heading mb-2">My Activities</h1>
            <p className="text-theme-secondary">
              Manage your events, services, and product listings
            </p>
          </div>
          <button
            onClick={() => {
              if (activeTab === 'events') {
                setEditingEvent(null);
                setCreateModalOpen(true);
              } else if (activeTab === 'services') {
                setEditingService(null);
                setCreateServiceModalOpen(true);
              } else {
                setEditingProduct(null);
                setCreateProductModalOpen(true);
              }
            }}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-teal-500/30 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {activeTab === 'events'
              ? 'Create Event'
              : activeTab === 'services'
                ? 'Create Service'
                : 'Sell Product'}
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex flex-wrap gap-2 mb-8 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setActiveTab('events')}
            data-tab="events"
            className={`px-6 py-3 font-semibold transition-all relative whitespace-nowrap ${
              activeTab === 'events'
                ? 'text-cyan-600 dark:text-cyan-400'
                : 'text-theme-secondary hover:text-heading'
            }`}
          >
            <Trophy className="inline w-5 h-5 mr-2" />
            My Events ({eventsCreated.length})
            {activeTab === 'events' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500 to-purple-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('services')}
            data-tab="services"
            className={`px-6 py-3 font-semibold transition-all relative whitespace-nowrap ${
              activeTab === 'services'
                ? 'text-purple-600 dark:text-purple-400'
                : 'text-theme-secondary hover:text-heading'
            }`}
          >
            <Stethoscope className="inline w-5 h-5 mr-2" />
            My Services ({services.length})
            {activeTab === 'services' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-600"></div>
            )}
          </button>
          <button
            onClick={() => setActiveTab('products')}
            data-tab="products"
            className={`px-6 py-3 font-semibold transition-all relative whitespace-nowrap ${
              activeTab === 'products'
                ? 'text-green-600 dark:text-green-400'
                : 'text-theme-secondary hover:text-heading'
            }`}
          >
            <Package className="inline w-5 h-5 mr-2" />
            My Products ({products.length})
            {activeTab === 'products' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-emerald-600"></div>
            )}
          </button>
        </div>

        {/* Stats */}
        {activeTab === 'events' ? null : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="rounded-2xl p-6 themed-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-secondary mb-1">Total Services</p>
                  <p className="text-3xl font-bold text-heading">{services.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6 themed-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-secondary mb-1">Active Services</p>
                  <p className="text-3xl font-bold text-heading">
                    {services.filter((s) => s.active).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>

            <div className="rounded-2xl p-6 themed-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-theme-secondary mb-1">Avg. Rating</p>
                  <p className="text-3xl font-bold text-heading">
                    {services.length > 0
                      ? (
                          services.reduce((sum, s) => sum + (s.rating?.average || 0), 0) /
                          services.length
                        ).toFixed(1)
                      : '0.0'}
                  </p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center">
                  <Star className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {(() => {
          if (activeTab === 'events') {
            return (
              <div className="space-y-8">
                {/* Search My Events */}
                <div className="flex items-center justify-between gap-3">
                  <div className="w-full sm:w-80">
                    <SearchBar
                      value={eventSearch}
                      onChange={(v) => setEventSearch(v)}
                      placeholder="Search my events"
                      ariaLabel="Search my events"
                    />
                  </div>
                </div>
                {/* Events I Created */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold text-heading">Events I Created</h2>
                    <button
                      className="text-sm text-theme-secondary hover:text-heading"
                      onClick={() => setOrganizingListOpen((v) => !v)}
                    >
                      {organizingListOpen ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {eventsCreated.length === 0 ? (
                    <div className="rounded-2xl p-8 text-center themed-card">
                      <p className="text-theme-secondary mb-4">You haven\'t created any events yet.</p>
                      <button
                        onClick={() => { setEditingEvent(null); setCreateModalOpen(true); }}
                        className="px-5 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg"
                      >
                        Create Event
                      </button>
                    </div>
                  ) : organizingListOpen ? (
                    <div className="max-h-[460px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {eventsCreated.filter(matchesEventSearch).map((ev) => (
                        <div key={ev._id} className="rounded-2xl overflow-hidden themed-card">
                          <div className="bg-gradient-to-r from-cyan-600 to-purple-600 p-5">
                            <h3 className="text-white text-xl font-semibold line-clamp-1">{ev.title}</h3>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Calendar className="w-4 h-4 text-cyan-600" />
                              <span>{dayjs(ev.startDate || ev.date).format('MMM D, YYYY')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <MapPin className="w-4 h-4 text-purple-600" />
                              <span>{ev.location?.city || ev.location?.address || 'Online'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Users className="w-4 h-4 text-emerald-600" />
                              <span>{(ev.participants?.length || 0)} / {(ev.capacity?.max || ev.maxParticipants || 0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setParticipantsModalEvent(ev)}
                                className="px-3 py-2 text-sm rounded-md border"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                View Participants
                              </button>
                              <button
                                onClick={() => handleEdit(ev)}
                                className="px-3 py-2 text-sm rounded-md border"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(ev._id)}
                                disabled={deletingId === ev._id}
                                className="px-3 py-2 text-sm rounded-md border text-red-600 disabled:opacity-50"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {/* Events I Joined */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold text-heading">Events I Joined</h2>
                    <button
                      className="text-sm text-theme-secondary hover:text-heading"
                      onClick={() => setJoinedListOpen((v) => !v)}
                    >
                      {joinedListOpen ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  {eventsJoined.length === 0 ? (
                    <div className="rounded-2xl p-8 text-center themed-card">
                      <p className="text-theme-secondary">You haven\'t joined any events yet.</p>
                    </div>
                  ) : joinedListOpen ? (
                    <div className="max-h-[460px] overflow-y-auto pr-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        {eventsJoined.filter(matchesEventSearch).map((ev) => (
                        <div key={ev._id} className="rounded-2xl overflow-hidden themed-card">
                          <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 p-5">
                            <h3 className="text-white text-xl font-semibold line-clamp-1">{ev.title}</h3>
                          </div>
                          <div className="p-5 space-y-3">
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Calendar className="w-4 h-4 text-emerald-600" />
                              <span>{dayjs(ev.startDate || ev.date).format('MMM D, YYYY')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <MapPin className="w-4 h-4 text-cyan-600" />
                              <span>{ev.location?.city || ev.location?.address || 'Online'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Users className="w-4 h-4 text-purple-600" />
                              <span>{(ev.participants?.length || 0)} / {(ev.capacity?.max || ev.maxParticipants || 0)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setParticipantsModalEvent(ev)}
                                className="px-3 py-2 text-sm rounded-md border"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                View Participants
                              </button>
                              <button
                                onClick={() => handleLeave(ev._id)}
                                disabled={deletingId === ev._id}
                                className="px-3 py-2 text-sm rounded-md border text-red-600 disabled:opacity-50"
                                style={{ borderColor: 'var(--border)' }}
                              >
                                Leave Event
                              </button>
                            </div>
                          </div>
                        </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          } else if (activeTab === 'services') {
            return (
              <>
                {/* Services Tab Content */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="w-full sm:w-80">
                    <SearchBar
                      value={serviceSearch}
                      onChange={(v) => setServiceSearch(v)}
                      placeholder="Search my services"
                      ariaLabel="Search my services"
                    />
                  </div>
                </div>
                {services.length === 0 ? (
                  <div className="rounded-3xl p-12 text-center themed-card">
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900 dark:to-pink-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Stethoscope className="w-10 h-10 text-purple-500" />
                      </div>
                      <h3 className="text-xl font-bold text-heading mb-2">No Services Yet</h3>
                      <p className="text-theme-secondary mb-6">
                        You haven't created any services. Start by offering your first service!
                      </p>
                      <button
                        onClick={() => setCreateServiceModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 inline-flex items-center gap-2 shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                        Create Your First Service
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {services.filter(matchesServiceSearch).map((service) => (
                      <div
                        key={service._id}
                        className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 themed-card"
                      >
                        {/* Service Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                                {service.name}
                              </h3>
                              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-medium capitalize">
                                {service.category.replace(/-/g, ' ')}
                              </span>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEditService(service)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-white"
                                title="Edit Service"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteService(service._id)}
                                disabled={deletingId === service._id}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition text-white disabled:opacity-50"
                                title="Delete Service"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Service Details */}
                        <div className="p-6 space-y-4">
                          <p className="text-theme-secondary line-clamp-2">{service.description}</p>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Trophy className="w-4 h-4 text-purple-500" />
                              <span>{service.sport}</span>
                            </div>

                            <div className="flex items-center gap-2 text-theme-secondary">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span>
                                ${service.pricing.amount} /{' '}
                                {service.pricing.type.replace(/-/g, ' ')}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-theme-secondary">
                              <MapPin className="w-4 h-4 text-pink-500" />
                              <span className="capitalize">
                                {service.location.type === 'online'
                                  ? 'Online'
                                  : service.location.city || service.location.type}
                              </span>
                            </div>

                            {service.duration && (
                              <div className="flex items-center gap-2 text-theme-secondary">
                                <Clock className="w-4 h-4 text-cyan-500" />
                                <span>
                                  {service.duration.value} {service.duration.unit}
                                </span>
                              </div>
                            )}
                          </div>

                          {service.qualifications && service.qualifications.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {service.qualifications
                                .slice(0, 3)
                                .map((qual: string, idx: number) => (
                                  <span
                                    key={idx}
                                    className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-1 rounded text-xs"
                                  >
                                    {qual}
                                  </span>
                                ))}
                              {service.qualifications.length > 3 && (
                                <span className="text-xs text-theme-secondary self-center">
                                  +{service.qualifications.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Status & Meta */}
                          <div
                            className="flex items-center justify-between pt-4 border-t"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                  service.active
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                }`}
                              >
                                {service.active ? 'Active' : 'Inactive'}
                              </span>
                              {service.rating?.average > 0 && (
                                <div className="flex items-center gap-1 text-yellow-500">
                                  <Star className="w-4 h-4 fill-current" />
                                  <span className="text-sm font-medium">
                                    {service.rating.average.toFixed(1)}
                                  </span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-theme-secondary">
                              Created {dayjs(service.createdAt).fromNow()}
                            </span>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          } else {
            return (
              <>
                {/* Products Tab Content */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <input
                    className="input w-full sm:w-80"
                    placeholder="Search my products"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                  />
                </div>
                {products.length === 0 ? (
                  <div className="rounded-3xl p-12 text-center themed-card">
                    <div className="max-w-md mx-auto">
                      <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-200 dark:from-green-900 dark:to-emerald-900 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Package className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-bold text-heading mb-2">No Products Yet</h3>
                      <p className="text-theme-secondary mb-6">
                        You haven't listed any products. Start selling your sports gear and
                        merchandise!
                      </p>
                      <button
                        onClick={() => setCreateProductModalOpen(true)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl transition-all duration-300 inline-flex items-center gap-2 shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                        List Your First Product
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-[460px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {products.filter(matchesProductSearch).map((product) => (
                      <div
                        key={product._id}
                        className="rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 themed-card"
                      >
                        {/* Product Header */}
                        <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
                                {product.title}
                              </h3>
                              <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-lg text-sm font-medium capitalize">
                                {product.category}
                              </span>
                            </div>
                            <div className="flex gap-2 ml-4">
                              <button
                                onClick={() => handleEditProduct(product)}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition text-white"
                                title="Edit Product"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product._id)}
                                disabled={deletingId === product._id}
                                className="p-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg transition text-white disabled:opacity-50"
                                title="Delete Product"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Product Details */}
                        <div className="p-6 space-y-4">
                          <p className="text-theme-secondary line-clamp-2">{product.description}</p>

                          <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2 text-theme-secondary">
                              <DollarSign className="w-4 h-4 text-green-500" />
                              <span className="font-semibold text-lg">
                                {product.price} {product.currency || 'USD'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 text-theme-secondary">
                              <Package className="w-4 h-4 text-green-500" />
                              <span className="capitalize">{product.condition}</span>
                            </div>

                            {product.location && (
                              <div className="flex items-center gap-2 text-theme-secondary">
                                <MapPin className="w-4 h-4 text-green-500" />
                                <span>{product.location}</span>
                              </div>
                            )}

                            {product.shippingAvailable && (
                              <div className="flex items-center gap-2 text-theme-secondary">
                                <Truck className="w-4 h-4 text-blue-500" />
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  Shipping Available
                                  {product.shippingCost > 0 &&
                                    ` (${product.currency} ${product.shippingCost})`}
                                </span>
                              </div>
                            )}

                            {product.quantity && (
                              <div className="flex items-center gap-2 text-theme-secondary">
                                <Package className="w-4 h-4 text-gray-500" />
                                <span>{product.quantity} available</span>
                              </div>
                            )}
                          </div>

                          {product.tags && product.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                              {product.tags.slice(0, 3).map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded text-xs"
                                >
                                  #{tag}
                                </span>
                              ))}
                              {product.tags.length > 3 && (
                                <span className="text-xs text-theme-secondary self-center">
                                  +{product.tags.length - 3} more
                                </span>
                              )}
                            </div>
                          )}

                          {/* Status & Meta */}
                          <div
                            className="flex items-center justify-between pt-4 border-t"
                            style={{ borderColor: 'var(--border)' }}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-medium ${
                                  product.status === 'active'
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
                                }`}
                              >
                                {product.status}
                              </span>
                              {product.views > 0 && (
                                <div className="flex items-center gap-1 text-theme-secondary">
                                  <Eye className="w-4 h-4" />
                                  <span className="text-xs">{product.views}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-theme-secondary">
                              Created {dayjs(product.createdAt).fromNow()}
                            </span>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            );
          }
        })()}
      </div>

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setEditingEvent(null);
        }}
        token={token}
        onSuccess={handleCreateSuccess}
        editingEvent={editingEvent}
      />

      {/* Create/Edit Service Modal */}
      <CreateServiceModal
        isOpen={createServiceModalOpen}
        onClose={() => {
          setCreateServiceModalOpen(false);
          setEditingService(null);
        }}
        onServiceCreated={handleServiceCreateSuccess}
        token={token}
        editService={editingService}
      />

      {/* Create/Edit Product Modal */}
      <CreateProductModal
        isOpen={createProductModalOpen}
        onClose={() => {
          setCreateProductModalOpen(false);
          setEditingProduct(null);
        }}
        onProductCreated={handleProductCreateSuccess}
        token={token}
        editProduct={editingProduct}
      />

      {/* Event Participants Modal */}
      {participantsModalEvent && (
        <EventParticipantsModal
          event={participantsModalEvent}
          onClose={() => setParticipantsModalEvent(null)}
          onMessage={handleMessageUser}
          onViewProfile={handleViewProfile}
          onApproveRequest={handleApproveRequest}
          onRejectRequest={handleRejectRequest}
          currentUserId={currentUser._id}
          isOrganizer={participantsModalEvent?.organizer?._id === currentUser._id}
        />
      )}
    </div>
  );
}
