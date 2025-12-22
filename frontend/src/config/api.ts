// frontend/src/config/api.ts
// Centralized API configuration to handle environment variables correctly

const getBaseURL = (): string => {
  const envURL = import.meta.env.VITE_API_URL;

  // If VITE_API_URL is set at build time, use it
  if (envURL) return envURL.replace(/\/$/, '');

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
