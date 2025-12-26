// frontend/src/components/AssistantWidget.tsx
import React, { useState } from 'react';
import { useEffect } from 'react';
import { useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { MessageCircle, X, Send, Search as SearchIcon, Bot, EyeOff, Trash2 } from 'lucide-react';

interface AssistantWidgetProps {
  token: string | null;
  user?: { username?: string; favoriteSports?: string[] } | null;
  currentView?: string;
  view?: string;
}

export default function AssistantWidget({ token, user, currentView, view }: AssistantWidgetProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [hidden, setHidden] = useState<boolean>(() => {
    try {
      return localStorage.getItem('teakonn.assistantHidden') === 'true';
    } catch {
      return false;
    }
  });

  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ hidden: boolean }>;
      const next = ce?.detail?.hidden;
      if (typeof next === 'boolean') {
        setHidden(next);
      }
    };
    window.addEventListener('teakonn.assistant.toggle', handler as EventListener);
    return () => window.removeEventListener('teakonn.assistant.toggle', handler as EventListener);
  }, []);

  async function send() {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      if (!token) {
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            text: 'Please log in to use the assistant. Once logged in, I can personalize suggestions and chat. You can still try Quick Search below.',
          },
        ]);
        return;
      }
      // Prefer streaming for a smoother experience
      const streamed = await sendStream(text);
      if (!streamed) {
        const resp = await axios.post(
          `${API_URL}/ai/assistant`,
          { message: text },
          token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
        );
        const reply = resp.data?.reply || "I'm here to help!";
        setMessages((m) => [...m, { role: 'assistant', text: reply }]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          text: e?.response?.data?.details || "Sorry, I couldn't process that.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function clearChat() {
    try {
      controllerRef.current?.abort();
    } catch {}
    controllerRef.current = null;
    setMessages([]);
    setLoading(false);
  }

  async function sendStream(text: string) {
    try {
      const ac = new AbortController();
      controllerRef.current = ac;
      const resp = await fetch(`${API_URL}/ai/assistant/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text }),
        signal: ac.signal,
      });
      if (!resp.ok || !resp.body) return false;

      // Start assistant placeholder message
      let idx = -1;
      setMessages((m) => {
        idx = m.length;
        return [...m, { role: 'assistant', text: '' }];
      });

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const updateText = (delta: string) => {
        setMessages((m) => {
          const next = [...m];
          const cur = next[idx];
          if (cur) next[idx] = { ...cur, text: (cur.text || '') + delta };
          return next;
        });
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';
        for (const part of parts) {
          if (!part) continue;
          const lines = part.split('\n');
          for (const line of lines) {
            if (line.startsWith('data:')) {
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') {
                break;
              }
              try {
                const json = JSON.parse(payload);
                // OpenAI stream payload: choices[0].delta.content
                const content = json?.choices?.[0]?.delta?.content || json?.reply || '';
                if (content) updateText(content);
              } catch {
                // Non-JSON or error messages
              }
            }
          }
        }
      }
      controllerRef.current = null;
      return true;
    } catch {
      controllerRef.current = null;
      return false;
    }
  }

  async function quickSearch(q: string) {
    setOpen(true);
    setMessages((m) => [...m, { role: 'user', text: `Search: ${q}` }]);
    setLoading(true);
    try {
      const favs = (user?.favoriteSports || []).join(',');
      const resp = await axios.get(`${API_URL}/ai/search`, { params: { query: q, favs } });
      const { events = [], services = [], users = [], items = [] } = resp.data || {};
      const lines: string[] = [];
      if (events.length) {
        lines.push(`Events:`);
        lines.push(...events.map((e: any) => `- ${e.title} (${e.location?.city || 'TBD'})`));
      }
      if (services.length) {
        lines.push(`Services:`);
        lines.push(...services.map((s: any) => `- ${s.name} (${s.sport})`));
      }
      if (items.length) {
        lines.push(`Products:`);
        lines.push(...items.map((it: any) => `- ${it.title} (${it.category})`));
      }
      if (users.length) {
        lines.push(`Users:`);
        lines.push(
          ...users.map((u: any) => `- ${u.username} (${(u.favoriteSports || []).join(', ')})`),
        );
      }
      setMessages((m) => [
        ...m,
        { role: 'assistant', text: lines.join('\n') || 'No results found.' },
      ]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'assistant', text: 'Search failed.' }]);
    } finally {
      setLoading(false);
    }
  }

  const activeView = currentView ?? view;
  // Safe bottom spacing for mobile (accounts for device safe-area)
  const bottomClass = 'bottom-[max(1rem,env(safe-area-inset-bottom))]';
  // Predictable side anchoring: tighter on mobile, roomy on desktop
  const positionClass = activeView === 'posts' ? 'left-4 md:left-6' : 'right-4 md:right-6';

  if (hidden) return null;
  return (
    <div className={`fixed ${bottomClass} ${positionClass} z-40`}>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="p-4 rounded-full shadow-lg bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-xl transition-all"
          aria-label="Open assistant"
        >
          <Bot className="w-6 h-6" />
        </button>
      ) : (
        <div className="w-[min(92vw,360px)] md:w-[360px] rounded-2xl themed-card shadow-xl">
          <div
            className="flex items-center justify-between p-3 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              <span className="font-semibold text-heading">Assistant</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="themed-card p-2 rounded"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setHidden(true);
                  try {
                    localStorage.setItem('teakonn.assistantHidden', 'true');
                  } catch {}
                  setOpen(false);
                }}
                className="themed-card p-2 rounded"
                title="Hide assistant"
              >
                <EyeOff className="w-4 h-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="themed-card p-2 rounded"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick chips */}
          <div className="p-3 flex flex-wrap gap-2">
            <button
              onClick={() => quickSearch(user?.favoriteSports?.[0] || 'football')}
              className="chip"
            >
              Find events
            </button>
            <button onClick={() => quickSearch('physiotherapy')} className="chip">
              Find services
            </button>
            <button onClick={() => quickSearch('marketplace shoes')} className="chip">
              Search products
            </button>
          </div>

          {/* Messages */}
          <div className="p-3 max-h-64 overflow-y-auto space-y-2">
            {messages.map((m, idx) => (
              <div key={idx} className={m.role === 'user' ? 'text-right' : ''}>
                <div
                  className={`inline-block px-3 py-2 rounded-xl text-sm ${m.role === 'user' ? 'bg-gradient-to-r from-accent to-accentViolet-light text-white' : 'themed-card'}`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-theme-secondary text-sm">Thinking…</div>}
          </div>

          {/* Input */}
          <div className="p-3 flex gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
            <input
              className="input flex-1 text-sm"
              placeholder="Ask for help…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
            />
            <button className="btn px-3" onClick={send} disabled={loading}>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
