import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateServiceModal from '../components/CreateServiceModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MapPin, BadgeCheck, ClipboardList, DollarSign, Tag } from 'lucide-react';
import SearchBar from '../components/SearchBar';

interface MyServicesProps {
  token: string | null;
  onNavigate?: (view: string) => void;
  onToast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  onUpdated?: () => void;
}

export default function MyServices({ token, onNavigate, onToast, onUpdated }: MyServicesProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [openCreate, setOpenCreate] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);
  const [query, setQuery] = useState<string>('');
  const [showServices, setShowServices] = useState<boolean>(() => {
    try { return JSON.parse(localStorage.getItem('myservices.show') || 'true'); } catch { return true; }
  });

  async function refresh() {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/services/my/created`, { headers });
      setServices(res.data?.services || []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, [token]);
  useEffect(() => { localStorage.setItem('myservices.show', JSON.stringify(showServices)); }, [showServices]);

  const categoryBadge = (raw?: string) => {
    const c = (raw || '').toLowerCase();
    const map: Record<string, string> = {
      'personal-training': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
      'group-classes': 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
      'nutrition': 'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
      'physiotherapy': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      'sports-massage': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
      'mental-coaching': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      'technique-analysis': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      'custom-program': 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
      'online-coaching': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      'other': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    };
    return map[c] || map['other'];
  };

  return (
    <div className="min-h-screen themed-page">
      <div className="max-w-4xl mx-auto p-3 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Services</h2>
            <p className="text-sm text-theme-secondary">Manage your service offerings</p>
          </div>
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:justify-end w-full sm:w-auto">
            <div className="w-full sm:w-80">
              <SearchBar
                value={query}
                onChange={(v) => setQuery(v)}
                placeholder="Search services by name, category, city"
                ariaLabel="Search services"
              />
            </div>
            <button className="inline-flex items-center px-4 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => onNavigate && onNavigate('my-activities')}>Back</button>
            <button className="btn w-full sm:w-auto" onClick={() => setOpenCreate(true)}>Create Service</button>
          </div>
        </div>

        {error && <div className="rounded-xl border p-3 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 mb-4">{error}</div>}

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Services</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-theme-secondary">Show</span>
            <button className={`chip ${showServices ? 'chip-active' : ''}`} onClick={() => setShowServices(s => !s)} aria-pressed={showServices}>{showServices ? 'On' : 'Off'}</button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-gray-700 dark:text-gray-200">Loading...</div>
        ) : (
          showServices ? (
            services.length === 0 ? (
              <div className="rounded-xl border p-4 bg-white dark:bg-gray-900">
                <p className="text-sm text-gray-700 dark:text-gray-200">No services yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.filter((s) => {
                  const q = query.toLowerCase();
                  if (!q) return true;
                  return (
                    (s.name || s.title || '').toLowerCase().includes(q) ||
                    (s.category || '').toLowerCase().includes(q) ||
                    (s.location?.city || s.location?.name || '').toLowerCase().includes(q)
                  );
                }).map((s) => (
                  <div key={s._id} className="group themed-card rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all hover:ring-2 hover:ring-[var(--accent-cyan)]/40">
                    <div className="relative mb-3">
                      {s.images?.[0] ? (
                        <img src={s.images[0]} alt={s.name || s.title} className="w-full h-32 rounded-md object-cover" />
                      ) : (
                        <div className="w-full h-32 rounded-md bg-gradient-to-r from-indigo-500/20 to-emerald-500/20" />
                      )}
                      <div className="absolute inset-x-0 bottom-0 h-1 rounded-full bg-gradient-to-r from-indigo-500/40 to-emerald-500/40" />
                    </div>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{s.name || s.title}</div>
                        <div className="mt-1 flex items-center gap-2 text-sm text-theme-secondary">
                          <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
                          <span>{s.location?.city || s.location?.name || 'Location TBA'}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full ${categoryBadge(s.category)}`}>
                            <Tag className="w-3 h-3 mr-1" /> {s.category}
                          </span>
                        </div>
                      </div>
                      <span className={`badge ${s.active ? 'badge-accent' : ''}`}>{s.active ? 'Active' : 'Inactive'}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-theme-secondary">
                      <DollarSign className="w-4 h-4 text-[var(--accent-amber)]" />
                      <span>
                        {s.pricing?.amount
                          ? new Intl.NumberFormat(undefined, {
                              style: 'currency',
                              currency: s.pricing?.currency || 'USD',
                              maximumFractionDigits: 2,
                            }).format(Number(s.pricing?.amount || 0))
                          : 'Free'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn inline-flex items-center px-3 py-2 w-full sm:w-auto" onClick={() => { setEditingService(s); setOpenCreate(true); }}>
                        <ClipboardList className="w-4 h-4 mr-2" /> Edit
                      </button>
                      <button className="inline-flex items-center px-3 py-2 rounded-md border hover:bg-[var(--accent-cyan-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)]/40 w-full sm:w-auto" onClick={() => setSelectedService(s)}>
                        <BadgeCheck className="w-4 h-4 mr-2" /> View
                      </button>
                      <button className="inline-flex items-center px-3 py-2 rounded-md bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400 w-full sm:w-auto" onClick={() => setConfirmDeleteServiceId(s._id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null
        )}
      </div>

      {openCreate && (
        <CreateServiceModal
          isOpen={openCreate}
          onClose={() => setOpenCreate(false)}
          token={token || ''}
          onServiceCreated={() => { setEditingService(null); refresh(); onUpdated && onUpdated(); onToast && onToast(editingService ? 'Service updated.' : 'Service created.', 'success'); }}
          editService={editingService}
        />
      )}
      {/* View modal */}
      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl w-full max-w-lg shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedService.name || selectedService.title}</h3>
              <button className="px-3 py-1 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => setSelectedService(null)}>Close</button>
            </div>
            <div className="p-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <div>Location: {selectedService.location?.city || selectedService.location?.name || 'N/A'}</div>
              <div>Status: {selectedService.active ? 'Active' : 'Inactive'}</div>
              <div>
                Price:{' '}
                {selectedService.pricing?.amount
                  ? new Intl.NumberFormat(undefined, {
                      style: 'currency',
                      currency: selectedService.pricing?.currency || 'USD',
                      maximumFractionDigits: 2,
                    }).format(Number(selectedService.pricing?.amount || 0))
                  : 'Free'}
              </div>
              {selectedService.description && <div className="mt-2 text-gray-700 dark:text-gray-200">{selectedService.description}</div>}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 justify-end">
              <button className="px-3 py-2 rounded-md bg-indigo-600 text-white" onClick={() => { setEditingService(selectedService); setOpenCreate(true); }}>Edit</button>
              <button className="px-3 py-2 rounded-md bg-rose-600 text-white" onClick={() => { setConfirmDeleteServiceId(selectedService._id); }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <ConfirmDialog
        isOpen={!!confirmDeleteServiceId}
        title="Delete Service"
        message="Delete this service? This cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={async () => {
          if (!token || !confirmDeleteServiceId) return;
          try {
            const headers = { Authorization: `Bearer ${token}` };
            await axios.delete(`${API_URL}/services/${confirmDeleteServiceId}`, { headers });
            await refresh();
            onUpdated && onUpdated();
            onToast && onToast('Service deleted.', 'success');
          } catch (e: any) {
            onToast && onToast(e.response?.data?.error || 'Failed to delete service', 'error');
          } finally {
            setConfirmDeleteServiceId(null);
          }
        }}
        onCancel={() => setConfirmDeleteServiceId(null)}
      />
    </div>
  );
}
