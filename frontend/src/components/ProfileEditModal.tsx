// frontend/src/components/ProfileEditModal.tsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../utils/api';
import { X } from 'lucide-react';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: any;
  onUpdated: (user: any) => void;
};

export default function ProfileEditModal({ visible, onClose, user, onUpdated }: Props) {
  const MAX_NAME = 30;
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [location, setLocation] = useState(user?.location || '');
  const [about, setAbout] = useState(user?.about || '');
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
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setName(user?.name || '');
    setUsername(user?.username || '');
    setEmail(user?.email || '');
    setLocation(user?.location || '');
    setAbout(user?.about || '');
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
      const safeName = (name || '').slice(0, MAX_NAME);
      const { data } = await api.put('/users/me', { name: safeName, username, email, location, about });
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

  async function deleteAccount() {
    try {
      setError(null);
      const ok = deleteConfirm.trim().toUpperCase() === 'DELETE';
      if (!ok) {
        setError('Please type DELETE to confirm');
        return;
      }
      await api.delete('/users/me', { data: { currentPassword: deletePassword || undefined } });
      try { localStorage.clear(); } catch {}
      window.location.reload();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to delete account');
    }
  }

  // ---- Avatar handling: drag/drop + client-side square resize ----
  function onPickAvatar() {
    avatarInputRef.current?.click();
  }

  async function prepareAvatar(file: File) {
    try {
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = (e) => reject(e);
        i.src = objectUrl;
      });

      const size = 512; // target square size
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas_ctx');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Compute square crop from center
      const minSide = Math.min(img.naturalWidth || img.width, img.naturalHeight || img.height);
      const sx = ((img.naturalWidth || img.width) - minSide) / 2;
      const sy = ((img.naturalHeight || img.height) - minSide) / 2;

      ctx.clearRect(0, 0, size, size);
      ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

      const blob: Blob = await new Promise((resolve) =>
        canvas.toBlob((b) => resolve(b as Blob), 'image/webp', 0.92),
      );
      const resizedFile = new File([blob], 'avatar.webp', { type: 'image/webp' });

      setAvatarFile(resizedFile);
      setAvatarPreview(URL.createObjectURL(blob));
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      // Fallback to original file if resizing fails
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  }

  function onAvatarInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) prepareAvatar(f);
  }

  function onAvatarDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) prepareAvatar(f);
  }

  function onAvatarDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    e.stopPropagation();
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
            <label className="text-xs text-theme-secondary">Name</label>
            <input
              className="input w-full mt-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={MAX_NAME}
            />
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-theme-secondary">Your display name.</p>
              <p className="text-xs text-theme-secondary">{name.length}/{MAX_NAME}</p>
            </div>
          </div>

          <div>
            <label className="text-xs text-theme-secondary">Email</label>
            <input className="input w-full mt-1" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          {/* Username (unique handle) */}
          <div>
            <label className="text-xs text-theme-secondary">Username</label>
            <input className="input w-full mt-1" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={30} />
            <p className="text-xs text-theme-secondary mt-1">3–30 chars. Allowed: letters, numbers, dot, dash, underscore. Must be unique.</p>
          </div>

          <div>
            <label className="text-xs text-theme-secondary">Location</label>
            <input className="input w-full mt-1" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div>
            <label className="text-xs text-theme-secondary">About</label>
            <textarea
              className="input w-full mt-1 min-h-[100px] resize-y"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Tell others about yourself, your interests, and experience."
            />
            <p className="text-xs text-theme-secondary mt-1">This can be longer text and has no hard limit.</p>
          </div>

          <div className="mt-2">
            <label className="text-xs text-theme-secondary">Profile Photo</label>
            <div
              className="mt-2 rounded-xl border-2 border-dashed themed-card p-3 flex items-center gap-3 hover:border-cyan-500/60 transition-colors"
              onDrop={onAvatarDrop}
              onDragOver={onAvatarDragOver}
            >
              <div className="w-20 h-20 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--border)' }}>
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="Avatar preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-theme-secondary">No image</div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-theme-secondary">Drag & drop or choose a photo. Optimized to 512×512 square.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" className="px-3 py-2 rounded-lg btn" onClick={onPickAvatar}>Choose File</button>
                  {avatarPreview && (
                    <button type="button" className="px-3 py-2 rounded-lg themed-card" onClick={() => { setAvatarPreview(null); setAvatarFile(null); }}>Remove</button>
                  )}
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={onAvatarInputChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-theme-secondary mt-1">JPG/PNG/WEBP • up to 5MB • We resize and crop to a square for best fit.</p>
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

          {/* Danger zone: Delete account */}
          <div className="mt-4 p-4 rounded-xl border border-red-500/40 bg-red-900/10">
            <h4 className="text-sm font-semibold text-red-300">Delete Account</h4>
            <p className="text-xs text-red-200 mt-1">This action is permanent. Your profile will be removed and you will be signed out.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-theme-secondary">Type DELETE to confirm</label>
                <input className="input w-full mt-1" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-theme-secondary">Current Password (if set)</label>
                <input className="input w-full mt-1" type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <button className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white" onClick={deleteAccount}>Delete Account</button>
            </div>
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
