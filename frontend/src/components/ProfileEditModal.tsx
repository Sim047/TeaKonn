// frontend/src/components/ProfileEditModal.tsx
import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { X } from 'lucide-react';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: any;
  onUpdated: (user: any) => void;
};

export default function ProfileEditModal({ visible, onClose, user, onUpdated }: Props) {
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [about, setAbout] = useState(user?.about || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    setUsername(user?.username || '');
    setBio(user?.bio || '');
    setAbout(user?.about || '');
    setLocation(user?.location || '');
    setError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
  }, [user, visible]);

  async function saveProfile() {
    try {
      setSaving(true);
      setError(null);

      // Update text fields
      const { data } = await api.put('/users/me', { username, bio, about, location });
      let updatedUser = data?.user || user;

      // Optional avatar upload
      if (avatarFile) {
        const form = new FormData();
        form.append('avatar', avatarFile);
        try {
          const up = await api.post('/users/avatar', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          updatedUser = up.data?.user || updatedUser;
        } catch (e: any) {
          console.warn('Avatar upload failed:', e?.response?.data || e?.message || e);
        }
      }

      // Persist locally
      try { localStorage.setItem('user', JSON.stringify(updatedUser)); } catch {}
      onUpdated(updatedUser);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl w-full max-w-lg border border-cyan-600/30 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Edit Profile</h3>
          <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose} title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div>
            <label className="text-xs text-theme-secondary">Username</label>
            <input className="input w-full mt-1" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
            <p className="text-xs text-theme-secondary mt-1">Allowed: letters, numbers, dot, dash, underscore.</p>
          </div>

          <div>
            <label className="text-xs text-theme-secondary">Bio</label>
            <textarea className="input w-full mt-1" value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={300} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-theme-secondary">About</label>
              <input className="input w-full mt-1" value={about} onChange={(e) => setAbout(e.target.value)} maxLength={120} />
            </div>
            <div>
              <label className="text-xs text-theme-secondary">Location</label>
              <input className="input w-full mt-1" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
            </div>
          </div>

          <div className="mt-2">
            <label className="text-xs text-theme-secondary">Profile Photo</label>
            <div className="flex items-center gap-3 mt-2">
              <input type="file" accept="image/*" onChange={(e) => {
                const f = e.target.files?.[0] || null;
                setAvatarFile(f);
                setAvatarPreview(f ? URL.createObjectURL(f) : null);
              }} />
              {avatarPreview && (
                <img src={avatarPreview} className="w-16 h-16 rounded-lg object-cover border" style={{ borderColor: 'var(--border)' }} />
              )}
            </div>
            <p className="text-xs text-theme-secondary mt-1">JPG/PNG/WEBP up to 5MB. Cropped to square.</p>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
          <button className="flex-1 btn" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          <button className="flex-1 px-4 py-2 rounded-lg themed-card" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
