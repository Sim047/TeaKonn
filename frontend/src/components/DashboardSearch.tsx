import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Search, Users, Trophy, Calendar, Stethoscope, ShoppingBag, Hash } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "";

interface DashboardSearchProps {
  token: string;
  onNavigate?: (view: string) => void;
  onViewProfile?: (user: any) => void;
}

type ResultItem = {
  type: "user" | "event" | "other" | "service" | "product" | "post";
  id: string;
  title: string;
  subtitle?: string;
  raw?: any;
};

export default function DashboardSearch({ token, onNavigate, onViewProfile }: DashboardSearchProps) {
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQ = useDebounce(q, 250);

  useEffect(() => {
    if (!debouncedQ || debouncedQ.trim().length < 2) {
      setResults([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const [usersRes, eventsRes, postsRes, servicesRes, marketRes] = await Promise.all([
          axios.get(`${API}/api/users/all`, { params: { search: debouncedQ, limit: 15 }, headers }),
          axios.get(`${API}/api/events`, { params: { search: debouncedQ, category: "sports" }, headers }),
          axios.get(`${API}/api/posts`, { params: { limit: 15 }, headers }),
          axios.get(`${API}/api/services`, { params: { limit: 15 }, headers }),
          axios.get(`${API}/api/marketplace`, { params: { limit: 15 }, headers }),
        ]);

        const users: ResultItem[] = (usersRes.data || []).slice(0, 15).map((u: any) => ({
          type: "user",
          id: u._id,
          title: u.username,
          subtitle: u.status || (u.username ? `@${u.username}` : ""),
          raw: u,
        }));

        const events: ResultItem[] = ((eventsRes.data?.events) || (eventsRes.data || [])).filter((e: any) =>
          textMatch(debouncedQ, [e.title, e.sport, e.location?.city, e.location?.venue])
        ).slice(0, 15).map((e: any) => ({
          type: "event",
          id: e._id,
          title: e.title,
          subtitle: [e.sport, e.location?.city].filter(Boolean).join(" · "),
          raw: e,
        }));

        const others: ResultItem[] = (postsRes.data?.posts || postsRes.data || []).filter((p: any) =>
          textMatch(debouncedQ, [p.title, p.caption, Array.isArray(p.tags) ? p.tags.join(" ") : p.tags])
        ).slice(0, 15).map((p: any) => ({
          type: "other",
          id: p._id,
          title: p.title || p.caption || "Post",
          subtitle: p.tags ? (Array.isArray(p.tags) ? p.tags.join(", ") : p.tags) : undefined,
          raw: p,
        }));

        const services: ResultItem[] = (servicesRes.data?.services || servicesRes.data || []).filter((s: any) =>
          textMatch(debouncedQ, [s.title, s.category, s.description])
        ).slice(0, 15).map((s: any) => ({
          type: "service",
          id: s._id,
          title: s.title,
          subtitle: [s.category, s.location?.city].filter(Boolean).join(" · "),
          raw: s,
        }));

        const products: ResultItem[] = (marketRes.data?.items || marketRes.data || []).filter((m: any) =>
          textMatch(debouncedQ, [m.title, m.category, m.description])
        ).slice(0, 15).map((m: any) => ({
          type: "product",
          id: m._id,
          title: m.title,
          subtitle: [m.category, m.price ? `${m.price} ${m.currency || ""}` : undefined].filter(Boolean).join(" · "),
          raw: m,
        }));

        setResults([...users, ...events, ...others, ...services, ...products].slice(0, 40));
      } catch (err) {
        console.error("DashboardSearch error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [debouncedQ, token]);

  function handleSelect(item: ResultItem) {
    switch (item.type) {
      case "user":
        onViewProfile && onViewProfile(item.raw);
        onNavigate && onNavigate("all-users");
        break;
      case "event":
        try { localStorage.setItem("auralink-highlight-event", item.id); } catch {}
        localStorage.setItem("auralink-discover-category", "sports");
        onNavigate && onNavigate("discover");
        break;
      case "other":
        try { localStorage.setItem("auralink-highlight-post", item.id); } catch {}
        localStorage.setItem("auralink-discover-category", "other");
        onNavigate && onNavigate("discover");
        break;
      case "service":
        localStorage.setItem("auralink-discover-category", "services");
        onNavigate && onNavigate("discover");
        break;
      case "product":
        localStorage.setItem("auralink-discover-category", "marketplace");
        onNavigate && onNavigate("discover");
        break;
    }
  }

  return (
    <div>
      <div className="w-full flex items-center gap-2 px-4 py-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text)' }}>
        <Search className="w-4 h-4 text-theme-secondary" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search users, events, posts, services"
          className="flex-1 bg-transparent outline-none text-sm sm:text-base"
        />
      </div>

      {/* Inline results list */}
      <div className="mt-3">
        {loading ? (
          <div className="text-theme-secondary text-sm">Searching…</div>
        ) : results.length === 0 && q.trim().length >= 2 ? (
          <div className="text-theme-secondary text-sm">No matches</div>
        ) : (
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {results.map((r) => (
              <button key={`${r.type}-${r.id}`} onClick={() => handleSelect(r)} className="w-full text-left rounded-lg themed-card hover:shadow-sm flex items-center gap-3 p-3">
                {iconFor(r.type)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-heading truncate">{r.title}</div>
                  {r.subtitle && <div className="text-theme-secondary text-xs truncate">{r.subtitle}</div>}
                </div>
                <div className="px-2 py-1 rounded-md border text-xs" style={{ borderColor: 'var(--border)' }}>{labelFor(r.type)}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function useDebounce<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function textMatch(q: string, fields: any[]) {
  const s = String(q).toLowerCase();
  return fields.some((f) => String(f || "").toLowerCase().includes(s));
}

function iconFor(type: ResultItem["type"]) {
  const cls = "w-5 h-5 text-theme-secondary";
  switch (type) {
    case "user": return <Users className={cls} />;
    case "event": return <Trophy className={cls} />;
    case "other": return <Calendar className={cls} />;
    case "service": return <Stethoscope className={cls} />;
    case "product": return <ShoppingBag className={cls} />;
    case "post": return <Hash className={cls} />;
    default: return <Search className={cls} />;
  }
}

function labelFor(type: ResultItem["type"]) {
  switch (type) {
    case "user": return "User";
    case "event": return "Event";
    case "other": return "Other";
    case "service": return "Service";
    case "product": return "Marketplace";
    case "post": return "Post";
    default: return "Result";
  }
}
