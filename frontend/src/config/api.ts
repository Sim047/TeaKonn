// frontend/src/config/api.ts
// Centralized API configuration to handle environment variables correctly

function normalizeBase(url?: string): string {
  if (!url) return '';
  let u = url.trim().replace(/\/$/, '');
  if (/^https?:\/\//i.test(u)) return u;
  if (u.startsWith('//')) {
    try {
      return (typeof window !== 'undefined' ? window.location.protocol : 'https:') + u;
    } catch {
      return 'https:' + u;
    }
  }
  if (u.startsWith('/')) {
    // If value is like "/host.tld" and contains a dot in first segment,
    // treat it as protocol-relative and convert to "https://host.tld".
    const afterSlash = u.slice(1);
    const firstSegment = afterSlash.split('/')[0] || '';
    if (!u.startsWith('//') && firstSegment.includes('.')) {
      try {
        const proto = typeof window !== 'undefined' ? window.location.protocol : 'https:';
        return `${proto}//${afterSlash}`;
      } catch {
        return 'https://' + afterSlash;
      }
    }
    try {
      return (typeof window !== 'undefined' ? window.location.origin : '') + u;
    } catch {
      return u;
    }
  }
  const isProd = (import.meta as any)?.env?.MODE === 'production';
  return `${isProd ? 'https://' : 'http://'}${u}`;
}

const getBaseURL = (): string => {
  const envURL = import.meta.env.VITE_API_URL;

  // If VITE_API_URL is set at build time, use it (normalized)
  if (envURL) return normalizeBase(envURL);

  // In production builds without an explicit VITE_API_URL, prefer the current origin
  // so the frontend will call the same host (useful when backend is proxied).
  try {
    if (import.meta.env.MODE === 'production' && typeof window !== 'undefined') {
      return window.location.origin.replace(/\/$/, '');
    }
  } catch (e) {}

  // Default for local development
  return 'http://localhost:5000';
};

export const BASE_URL = getBaseURL();
export const API_URL = `${BASE_URL}/api`;

// Export for backward compatibility
export const API = BASE_URL;

// One-time runtime log to verify resolved API base in the deployed app
try {
  if (typeof window !== 'undefined' && !(window as any).__API_BASE_LOGGED) {
    (window as any).__API_BASE_LOGGED = true;
    // Keep it concise but informative for debugging
    console.log('[API] Resolved BASE_URL:', BASE_URL, '| API_URL:', API_URL);
  }
} catch {}
