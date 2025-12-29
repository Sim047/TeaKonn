// frontend/src/components/StatusPicker.tsx
import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const API = API_URL.replace(/\/api$/, '');

export default function StatusPicker({ token, currentStatus, onUpdated }: any) {
  const [open, setOpen] = useState(false);
  const [mood, setMood] = useState(currentStatus?.mood || '');
  const [emoji, setEmoji] = useState(currentStatus?.emoji || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!token || (!mood && !emoji)) return;
    try {
      setSaving(true);
      console.log('StatusPicker: Saving status:', { mood, emoji });
      const res = await axios.post(
        API + '/api/status',
        { mood, emoji },
        { headers: { Authorization: 'Bearer ' + token } },
      );
      console.log('StatusPicker: Received response:', res.data);
      // Backend returns { success: true, status: {...} }
      const statusData = res.data?.status || res.data;
      if (statusData) {
        console.log('StatusPicker: Calling onUpdated with:', statusData);
        onUpdated(statusData);
      }
      setOpen(false);
    } catch (err) {
      console.error('status save error', err);
    } finally {
      setSaving(false);
    }
  }

  async function clearStatus() {
    if (!token) return;
    try {
      console.log('StatusPicker: Clearing status');
      await axios.delete(API + '/api/status', { headers: { Authorization: 'Bearer ' + token } });
      console.log('StatusPicker: Status cleared, calling onUpdated(null)');
      onUpdated(null);
      setMood('');
      setEmoji('');
      setOpen(false);
    } catch (err) {
      console.error('status clear error', err);
    }
  }

  function setPreset(p: any) {
    setMood(p.mood);
    setEmoji(p.emoji);
    // auto-save for fast UX
    setTimeout(save, 80);
  }

  const presets = [
    { emoji: '🟢', mood: 'Online' },
    { emoji: '🔴', mood: 'Busy' },
    { emoji: '🌙', mood: 'Away' },
  ];

  return (
    <div className="status-picker">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm text-slate-300">About</h4>
        <button
          className="text-xs text-cyan-400 hover:text-cyan-300 hover:underline transition-colors font-medium"
          onClick={() => setOpen(!open)}
        >
          {open ? 'Close' : 'Set status'}
        </button>
      </div>

      {!open && currentStatus && (
        <div className="py-2 px-3 rounded-lg inline-flex items-center gap-2 bg-slate-700/50 border border-slate-600">
          <span className="text-lg">{currentStatus.emoji}</span>
          <span className="text-sm font-medium text-slate-200">{currentStatus.mood}</span>
        </div>
      )}

      {!open && !currentStatus && <p className="text-xs text-slate-400 italic">No status set</p>}

      {open && (
        <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 mt-2">
          <div className="flex gap-2 mb-3 flex-wrap">
            {presets.map((p) => (
              <button
                key={p.mood}
                className="px-3 py-1.5 rounded-lg text-xs bg-slate-700 hover:bg-slate-600 border border-slate-600 hover:border-slate-500 transition-all font-medium"
                onClick={() => setPreset(p)}
              >
                {p.emoji} {p.mood}
              </button>
            ))}
          </div>

          <input
            className="w-full mb-2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Set your status (max 40 chars)"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            maxLength={40}
          />
          <input
            className="w-full mb-3 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Emoji (e.g., 😊)"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
          />

          <div className="flex gap-2">
            <button
              className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={save}
              disabled={saving || (!mood && !emoji)}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              className="px-4 py-2 border border-slate-600 hover:bg-slate-700 rounded-lg transition-all text-sm font-medium"
              onClick={clearStatus}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
