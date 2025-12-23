import axios from "axios";

function normalizeBase(url?: string): string {
  if (!url) return "";
  let u = url.trim().replace(/\/$/, "");
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith("//")) {
    try {
      return (typeof window !== "undefined" ? window.location.protocol : "https:") + u;
    } catch {
      return "https:" + u;
    }
  }
    if (u.startsWith("/")) {
      // Handle common misconfiguration: VITE_API_URL set as "/host.tld" instead of protocol-relative "//host.tld"
      // If it looks like a host (contains a dot) after the leading slash, treat it as protocol-relative.
      const afterSlash = u.slice(1);
      const firstSegment = afterSlash.split("/")[0] || "";
      if (!u.startsWith("//") && firstSegment.includes(".")) {
        try {
          const proto = typeof window !== "undefined" ? window.location.protocol : "https:";
          return `${proto}//${afterSlash}`;
        } catch {
          return "https://" + afterSlash;
        }
      }
      try {
        return (typeof window !== "undefined" ? window.location.origin : "") + u;
      } catch {
        return u;
      }
    }
  const isProd = (import.meta as any)?.env?.MODE === "production";
  return `${isProd ? "https://" : "http://"}${u}`;
}

const resolvedBase = `${normalizeBase(import.meta.env.VITE_API_URL)}/api`;

// One-time runtime log to verify axios baseURL resolution in the deployed app
try {
  if (typeof window !== "undefined" && !(window as any).__AXIOS_BASE_LOGGED) {
    (window as any).__AXIOS_BASE_LOGGED = true;
    console.log("[Axios] baseURL:", resolvedBase);
  }
} catch {}

const api = axios.create({
  baseURL: resolvedBase,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token) {
    cfg.headers = cfg.headers || {};
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;
