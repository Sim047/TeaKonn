// src/utils/api.ts
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
    try {
      return (typeof window !== "undefined" ? window.location.origin : "") + u;
    } catch {
      return u;
    }
  }
  const isProd = (import.meta as any)?.env?.MODE === "production";
  return `${isProd ? "https://" : "http://"}${u}`;
}

// Prefer runtime override provided via WebView/native injection, fallback to Vite env
const runtimeApi =
  (typeof window !== "undefined" && (window as any).__API_URL) ||
  (typeof window !== "undefined" && localStorage.getItem("API_URL")) ||
  import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: `${normalizeBase(runtimeApi)}/api`,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;
