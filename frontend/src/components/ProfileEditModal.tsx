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
  const [email, setEmail] = useState(user?.email || '');
  const [about, setAbout] = useState(user?.about || '');
  const [location, setLocation] = useState(user?.location || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  useEffect(() => {
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setAbout(user?.about || '');
    setLocation(user?.location || '');
    setError(null);
    setAvatarFile(null);
    setAvatarPreview(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
  }, [user, visible]);

  async function saveProfile() {
    try {
      setSaving(true);
      setError(null);

      // Update text fields
      const { data } = await api.put('/users/me', { username, email, about, location });
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

  async function changePassword() {
    try {
      setPasswordSaving(true);
      setPasswordError(null);
      setPasswordSuccess(null);
      if (newPassword.length < 8) {
        setPasswordError('New password must be at least 8 characters');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('Passwords do not match');
        return;
      }
      const { data } = await api.post('/users/change-password', { currentPassword, newPassword });
      if (data?.success) {
        setPasswordSuccess('Password updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (e: any) {
      setPasswordError(e?.response?.data?.message || e?.message || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl w-full max-w-lg border border-cyan-600/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        style={{ overscrollBehavior: 'contain', touchAction: 'pan-y' }}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'linear-gradient(to bottom, rgba(15,23,42,1), rgba(15,23,42,0.95))' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Edit Profile</h3>
          <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose} title="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ WebkitOverflowScrolling: 'touch' }}>
          {error && <div className="text-red-400 text-sm">{error}</div>}

          <div>
            <label className="text-xs text-theme-secondary">Username</label>
            <input className="input w-full mt-1" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
            <p className="text-xs text-theme-secondary mt-1">Allowed: letters, numbers, dot, dash, underscore.</p>
          </div>

          <div>
            <label className="text-xs text-theme-secondary">Email</label>
            <input className="input w-full mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />
          </div>

          {/* Bio removed per request */}

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

          <div className="mt-6 p-4 rounded-xl border" style={{ borderColor: 'var(--border)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Change Password</h4>
            {passwordError && <div className="text-red-400 text-xs mt-2">{passwordError}</div>}
            {passwordSuccess && <div className="text-green-400 text-xs mt-2">{passwordSuccess}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-theme-secondary">Current Password</label>
                <input className="input w-full mt-1" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-theme-secondary">New Password</label>
                <input className="input w-full mt-1" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-theme-secondary">Confirm New Password</label>
                <input className="input w-full mt-1" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="btn" onClick={changePassword} disabled={passwordSaving}>{passwordSaving ? 'Updating…' : 'Update Password'}</button>
              <button className="px-4 py-2 rounded-lg themed-card" onClick={() => { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(null); setPasswordSuccess(null); }}>Clear</button>
            </div>
            <p className="text-xs text-theme-secondary mt-2">Minimum 8 characters. If your account was created via Google, you can set a password here.</p>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2 sticky bottom-0 z-10" style={{ borderColor: 'var(--border)', background: 'linear-gradient(to top, rgba(15,23,42,1), rgba(15,23,42,0.95))' }}>
          <button className="flex-1 btn" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
          <button className="flex-1 px-4 py-2 rounded-lg themed-card" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
