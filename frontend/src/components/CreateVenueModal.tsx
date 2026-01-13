import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import MapPicker, { PlaceSelection } from './MapPicker';
import { useLoadScript, Autocomplete } from '@react-google-maps/api';
import { Building2 } from 'lucide-react';

interface CreateVenueModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string | null;
  onCreated?: () => void;
  editVenue?: any;
  onSaved?: () => void;
}

export default function CreateVenueModal({ isOpen, onClose, token, onCreated, editVenue, onSaved }: CreateVenueModalProps) {
  const apiKey = (import.meta as any)?.env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey || '', libraries: ['places'] });
  const addressAutoRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [form, setForm] = useState({
    name: '',
    locationName: '',
    address: '',
    city: '',
    state: '',
    country: '',
    coordinates: undefined as undefined | { lat: number; lng: number },
    capacity: 50,
    description: '',
    images: [] as string[],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

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
        images: Array.isArray(editVenue.images) ? editVenue.images : [],
      });
    } else if (isOpen && !editVenue) {
      setForm({ name: '', locationName: '', address: '', city: '', state: '', country: '', coordinates: undefined, capacity: 50, description: '', images: [] });
    }
  }, [editVenue, isOpen]);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length || !token) return;
    setError(null);
    setUploading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` } as any;
      const uploaded: string[] = [];
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) {
          setError('Each image must be under 10MB');
          continue;
        }
        const formData = new FormData();
        formData.append('file', file);
        const res = await axios.post(`${API_URL.replace(/\/api$/, '')}/api/files/upload`, formData, {
          headers: { ...headers, 'Content-Type': 'multipart/form-data' },
        });
        if (res.data?.url) uploaded.push(res.data.url);
      }
      const next = [...form.images, ...uploaded].slice(0, 10);
      setForm({ ...form, images: next });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to upload image(s)');
    } finally {
      setUploading(false);
      // Reset the input value so re-selecting same files triggers change
      e.currentTarget.value = '';
    }
  }

  function removeImage(idx: number) {
    const next = form.images.filter((_, i) => i !== idx);
    setForm({ ...form, images: next });
  }

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
          coordinates: form.coordinates,
        },
        capacity: { max: Number(form.capacity) },
        description: form.description,
        images: form.images,
      };
      if (editVenue?._id) {
        await axios.put(`${API_URL}/venues/${editVenue._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        onSaved && onSaved();
      } else {
        await axios.post(`${API_URL}/venues/create`, payload, { headers: { Authorization: `Bearer ${token}` } });
        onCreated && onCreated();
      }
      onClose();
      setForm({ name: '', locationName: '', address: '', city: '', state: '', country: '', coordinates: undefined, capacity: 50, description: '', images: [] });
    } catch (e: any) {
      setError(e.response?.data?.error || e.message || 'Failed to create venue');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-2xl mx-auto p-[1px] rounded-2xl bg-gradient-to-r from-cyan-400 to-purple-500 shadow-2xl">
        <div className="themed-card rounded-2xl overflow-hidden" style={{ background: 'var(--card)' }}>
          <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center gap-3">
              <div className="h-2 w-20 rounded-full bg-gradient-to-r from-[var(--accent-start)] to-[var(--accent-end)]" />
              <Building2 className="w-5 h-5 text-cyan-500/80" />
              <div className="leading-tight">
                <h3 className="text-lg font-semibold">{editVenue ? 'Edit Venue' : 'Create Venue'}</h3>
                <p className="text-xs text-theme-secondary">Add details for your venue</p>
              </div>
            </div>
            <button className="px-3 py-1 rounded-md border hover:bg-white/40 dark:hover:bg-slate-800/40" style={{ borderColor: 'var(--border)' }} onClick={onClose}>Close</button>
          </div>
          <div className="px-5 py-4">
            {error && <p className="text-red-600 mb-3 text-sm">{error}</p>}
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input className="input" placeholder="Venue name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                <input className="input" placeholder="Location name" value={form.locationName} onChange={(e) => setForm({ ...form, locationName: e.target.value })} />
              </div>

              {isLoaded ? (
                <Autocomplete
                  onLoad={(a) => (addressAutoRef.current = a)}
                  onPlaceChanged={() => {
                    const place = addressAutoRef.current?.getPlace();
                    if (!place) return;
                    const comps = place.address_components || [];
                    const get = (type: string) => comps.find(c => (c.types || []).includes(type))?.long_name || '';
                    const coords = place.geometry?.location
                      ? { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() }
                      : undefined;
                    setForm((prev) => ({
                      ...prev,
                      locationName: (place.name as string) || prev.locationName,
                      address: (place.formatted_address as string) || prev.address,
                      city: get('locality') || get('sublocality') || get('administrative_area_level_2') || prev.city,
                      state: get('administrative_area_level_1') || prev.state,
                      country: get('country') || prev.country,
                      coordinates: coords ?? prev.coordinates,
                    }));
                  }}
                >
                  <input
                    className="input"
                    placeholder="Address (search places)"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </Autocomplete>
              ) : (
                <input className="input" placeholder="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className="input" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <input className="input" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
                <input className="input" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Pick on Map (optional)</label>
                <MapPicker
                  value={{
                    name: form.locationName || form.name || undefined,
                    address: form.address || undefined,
                    city: form.city || undefined,
                    state: form.state || undefined,
                    country: form.country || undefined,
                    coordinates: form.coordinates,
                  }}
                  onChange={(next: PlaceSelection) => {
                    setForm({
                      ...form,
                      locationName: next.name || form.locationName,
                      address: next.address || form.address,
                      city: next.city || form.city,
                      state: next.state || form.state,
                      country: next.country || form.country,
                      coordinates: next.coordinates,
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input className="input md:col-span-1" type="number" min="1" placeholder="Capacity (max)" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} required />
                <textarea className="input md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-2">Venue Photos</label>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} id="venue-images" className="hidden" />
                <label htmlFor="venue-images" className="flex items-center justify-center gap-2 w-full px-4 py-8 rounded-xl cursor-pointer transition-colors border-2 border-dashed hover:border-cyan-400/70" style={{ borderColor: 'var(--border)' }}>
                  {uploading ? <span className="text-theme-secondary">Uploading…</span> : <span className="text-theme-secondary">Click to upload up to 10 photos</span>}
                </label>
                <p className="mt-1 text-xs text-theme-secondary">Tip: JPG/PNG/WebP, up to 10MB each. Max 10 photos.</p>
                {form.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {form.images.map((url, idx) => (
                      <div key={url + idx} className="relative group">
                        <img src={url} alt={`Venue ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <button type="button" onClick={() => removeImage(idx)} className="absolute top-1 right-1 px-2 py-1 text-xs rounded bg-black/60 text-white opacity-0 group-hover:opacity-100">Remove</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button type="button" className="px-4 py-2 rounded-md border hover:bg-white/40 dark:hover:bg-slate-800/40" style={{ borderColor: 'var(--border)' }} onClick={onClose}>Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-md bg-teal-600 text-white hover:bg-teal-500" disabled={loading || uploading}>{(loading || uploading) ? (editVenue ? 'Saving...' : 'Creating...') : (editVenue ? 'Save Changes' : 'Create Venue')}</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
