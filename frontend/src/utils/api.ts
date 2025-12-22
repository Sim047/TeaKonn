// src/utils/api.ts
import axios from "axios";

// Prefer runtime override provided via WebView/native injection, fallback to Vite env
const runtimeApi =
  (typeof window !== "undefined" && (window as any).__API_URL) ||
  (typeof window !== "undefined" && localStorage.getItem("API_URL")) ||
  import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: (runtimeApi ? runtimeApi : "") + "/api",
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("token");
  if (token && cfg.headers) {
    cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

export default api;
