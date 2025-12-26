import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onCreated?: () => void;
  editVenue?: any;
  onSaved?: () => void;
}

export default function CreateVenueModal({ isOpen, onClose, token, onCreated, editVenue, onSaved }: CreateVenueModalProps) {
  const [form, setForm] = useState({
    name: '',
    locationName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    capacity: 50,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editVenue && isOpen) {
      setForm({
        name: editVenue.name || '',
        locationName: editVenue.location?.name || '',
        address: editVenue.location?.address || '',
        city: editVenue.location?.city || '',
        state: editVenue.location?.state || '',
        country: editVenue.location?.country || '',
        capacity: editVenue.capacity?.max || 50,
        description: editVenue.description || '',
      });
    } else if (isOpen && !editVenue) {
      setForm({ name: '', locationName: '', address: '', city: '', state: '', country: '', capacity: 50, description: '' });
    }
  }, [editVenue, isOpen]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (!token) throw new Error('Not authenticated');
      const payload = {
        name: form.name,
        location: {
          name: form.locationName || form.name,
          address: form.address,
          city: form.city,
          state: form.state,
          country: form.country,
        },
        capacity: { max: Number(form.capacity) },
        description: form.description,
      };
      if (editVenue?._id) {
        await axios.put(`${API_URL}/venues/${editVenue._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        onSaved && onSaved();
      } else {
        await axios.post(`${API_URL}/venues/create`, payload, { headers: { Authorization: `Bearer ${token}` } });
        onCreated && onCreated();
      }
      onClose();
      setForm({ name: '', locationName: '', address: '', city: '', state: '', country: '', capacity: 50, description: '' });
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-xl shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{editVenue ? 'Edit Venue' : 'Create Venue'}</h3>
          <button className="px-3 py-1 rounded border" onClick={onClose}>Close</button>
        </div>
        {error && <p className="text-red-600 mb-2">{error}</p>}
        <form onSubmit={submit} className="space-y-3">
          <input className="input" placeholder="Venue name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <input className="input" placeholder="Location name" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} />
          <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            <input className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            <input className="input" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <input className="input" type="number" min="1" placeholder="Capacity (max)" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required />
          <textarea className="input" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2 justify-end">
            <button type="button" className="px-4 py-2 rounded border" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-teal-600 text-white" disabled={loading}>{loading ? (editVenue ? 'Saving...' : 'Creating...') : (editVenue ? 'Save Changes' : 'Create Venue')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
