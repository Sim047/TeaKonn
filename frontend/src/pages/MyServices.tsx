import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import CreateServiceModal from '../components/CreateServiceModal';
import ConfirmDialog from '../components/ConfirmDialog';

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

  return (
    <div className="min-h-full bg-gradient-to-b from-white to-gray-50 dark:from-black dark:to-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Services</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300">Manage your service offerings</p>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800" onClick={() => onNavigate && onNavigate('my-activities')}>Back</button>
            <button className="px-4 py-2 rounded-lg bg-teal-600 text-white shadow hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-400" onClick={() => setOpenCreate(true)}>Create Service</button>
          </div>
        </div>

        {error && <div className="rounded-xl border p-3 text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-300 mb-4">{error}</div>}

        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading...</div>
        ) : services.length === 0 ? (
          <div className="rounded-xl border p-4 bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-600 dark:text-gray-300">No services yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((s) => (
              <div key={s._id} className="rounded-xl border p-4 shadow-sm bg-white dark:bg-gray-800 hover:shadow-md hover:ring-1 hover:ring-gray-300 transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">{s.name || s.title}</div>
                    <div className="text-sm text-gray-700 dark:text-gray-200">{s.location?.city || s.location?.name}</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{s.active ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="mt-2 text-sm">Price: {s.pricing?.amount ? `${s.pricing?.currency || 'USD'} ${s.pricing?.amount}` : 'Free'}</div>
                <div className="mt-3 flex gap-2">
                  <button className="px-3 py-2 rounded-md bg-indigo-600 text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" onClick={() => { setEditingService(s); setOpenCreate(true); }}>Edit</button>
                  <button className="px-3 py-2 rounded-md border hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300" onClick={() => setSelectedService(s)}>View</button>
                  <button className="px-3 py-2 rounded-md border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 focus:outline-none focus:ring-2 focus:ring-red-300" onClick={() => setConfirmDeleteServiceId(s._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
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
              <div>Price: {selectedService.pricing?.amount ? `${selectedService.pricing?.currency || 'USD'} ${selectedService.pricing?.amount}` : 'Free'}</div>
              {selectedService.description && <div className="mt-2 text-gray-700 dark:text-gray-200">{selectedService.description}</div>}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex gap-2 justify-end">
              <button className="px-3 py-2 rounded-md bg-indigo-600 text-white" onClick={() => { setEditingService(selectedService); setOpenCreate(true); }}>Edit</button>
              <button className="px-3 py-2 rounded-md border border-red-500 text-red-600" onClick={() => { setConfirmDeleteServiceId(selectedService._id); }}>Delete</button>
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
